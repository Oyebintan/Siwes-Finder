import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Job from '@/models/Job';
import User from '@/models/User';
import { requireSession } from '@/lib/mobileAuth';
import { sendPushNotification } from '@/lib/push';
import { sendNewJobAlertEmail } from '@/lib/email';
import { computeMatchScore } from '@/lib/match';

type JobDoc = { toObject?: () => Record<string, unknown> };
function plainJob(job: JobDoc) {
  return typeof job.toObject === 'function' ? job.toObject() : (job as Record<string, unknown>);
}

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// POST: Create a new job placement (verified employers only)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    // Only approved companies may publish opportunities.
    const employer = await User.findById(session.user.id).select('verificationStatus');
    if (!employer || employer.verificationStatus !== 'approved') {
      return NextResponse.json(
        { error: 'Your company must be verified by an admin before you can post opportunities.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      title,
      location,
      type,
      duration,
      requirements,
      description,
      stipend,
      applicationMethod = 'platform',
      applicationEmail,
      applicationUrl,
      applicationDeadline,
      maxApplicants,
    } = body;

    if (!title || !location || !type || !duration || !description) {
      return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
    }

    // Validate the chosen application method has the data it needs.
    if (!['platform', 'email', 'external'].includes(applicationMethod)) {
      return NextResponse.json({ error: 'Invalid application method.' }, { status: 400 });
    }
    if (applicationMethod === 'email') {
      if (!applicationEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicationEmail)) {
        return NextResponse.json({ error: 'A valid application email is required for email applications.' }, { status: 400 });
      }
    }
    if (applicationMethod === 'external') {
      if (!applicationUrl || !/^https?:\/\/.+/i.test(applicationUrl)) {
        return NextResponse.json({ error: 'A valid application URL (http/https) is required for external applications.' }, { status: 400 });
      }
    }

    let parsedDeadline: Date | undefined;
    if (applicationDeadline) {
      parsedDeadline = new Date(applicationDeadline);
      if (Number.isNaN(parsedDeadline.getTime())) {
        return NextResponse.json({ error: 'Invalid application deadline.' }, { status: 400 });
      }
    }

    let parsedMaxApplicants: number | undefined;
    if (maxApplicants !== undefined && maxApplicants !== null && maxApplicants !== '') {
      parsedMaxApplicants = Number(maxApplicants);
      if (!Number.isInteger(parsedMaxApplicants) || parsedMaxApplicants < 1) {
        return NextResponse.json({ error: 'Maximum applicants must be a positive whole number.' }, { status: 400 });
      }
    }

    const newJob = await Job.create({
      employerId: session.user.id,
      title,
      location,
      type,
      duration,
      requirements: Array.isArray(requirements) ? requirements : [],
      description,
      stipend,
      applicationMethod,
      applicationEmail: applicationMethod === 'email' ? applicationEmail : undefined,
      applicationUrl: applicationMethod === 'external' ? applicationUrl : undefined,
      applicationDeadline: parsedDeadline,
      maxApplicants: parsedMaxApplicants,
    });

    // Best-effort "new opportunity" alert to students following this
    // company -- never fails the job posting itself. Each recipient's
    // push/email attempts are isolated so one bad token/address can't stop
    // the rest of the batch.
    try {
      const followers = await User.find({ followedEmployers: session.user.id }).select(
        'email name expoPushToken'
      );
      if (followers.length > 0) {
        const employerRecord = await User.findById(session.user.id).select('companyName name');
        const companyLabel = employerRecord?.companyName || employerRecord?.name || 'A company you follow';
        await Promise.allSettled(
          followers.map(async (follower) => {
            try {
              if (follower.expoPushToken) {
                await sendPushNotification(
                  follower.expoPushToken,
                  'New opportunity posted',
                  `${companyLabel} posted "${newJob.title}".`,
                  { type: 'new-job-alert', jobId: newJob._id.toString() }
                );
              }
            } catch (pushError) {
              console.error('Failed to send new-job alert push:', pushError);
            }
            try {
              if (follower.email) {
                await sendNewJobAlertEmail(
                  follower.email,
                  follower.name || 'there',
                  companyLabel,
                  newJob.title,
                  newJob._id.toString()
                );
              }
            } catch (emailError) {
              console.error('Failed to send new-job alert email:', emailError);
            }
          })
        );
      }
    } catch (followerLookupError) {
      console.error('Failed to notify followers of new job:', followerLookupError);
    }

    return NextResponse.json({ message: 'Job posted successfully', job: newJob }, { status: 201 });
  } catch (error) {
    console.error('Job posting error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET: employer sees own jobs; students see a searchable/filtered/paginated feed
// of active jobs from verified companies only.
export async function GET(req: Request) {
  try {
    const session = await requireSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    if (session.user.role === 'employer') {
      const jobs = await Job.find({ employerId: session.user.id }).sort({ createdAt: -1 });
      return NextResponse.json({ jobs }, { status: 200 });
    }

    // Public feed (students): only verified employers' active jobs.
    // A student session also gets a matchScore attached to each job (skill
    // overlap with the job's requirements, plus a small boost when the job's
    // location matches their preferred state) -- omitted entirely when the
    // student hasn't listed any skills yet, since a 0% score there would be
    // meaningless rather than informative.
    let matchProfile: { skills?: string[]; preferredState?: string } | null = null;
    if (session.user.role === 'student') {
      const studentRecord = await User.findById(session.user.id).select('skills preferredState');
      if (studentRecord?.skills && studentRecord.skills.length > 0) {
        matchProfile = { skills: studentRecord.skills, preferredState: studentRecord.preferredState };
      }
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();
    const type = (searchParams.get('type') || '').trim();
    const location = (searchParams.get('location') || '').trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '12', 10) || 12));
    const sort = (searchParams.get('sort') || 'newest').trim();

    const approvedEmployerIds = await User.find({
      role: 'employer',
      verificationStatus: 'approved',
    }).distinct('_id');

    // A job whose deadline has passed or applicant cap is filled may still
    // have a stale isActive:true (that only gets lazily corrected when a
    // student opens its detail page or tries to apply -- see
    // src/lib/jobStatus.ts) so the public feed filters both conditions
    // directly rather than trusting isActive alone.
    const now = new Date();
    const conditions: Record<string, unknown>[] = [
      { $or: [{ applicationDeadline: { $exists: false } }, { applicationDeadline: null }, { applicationDeadline: { $gt: now } }] },
      { $expr: { $or: [{ $eq: [{ $ifNull: ['$maxApplicants', null] }, null] }, { $lt: ['$applicantCount', '$maxApplicants'] }] } },
    ];
    if (q) {
      const rx = new RegExp(escapeRegex(q), 'i');
      // Search across everything a student would reasonably type: the role
      // itself, required skills ("Adobe Photoshop"), where it is, and who is
      // hiring (company name/industry, matched via the employer records).
      const matchingEmployerIds = await User.find({
        _id: { $in: approvedEmployerIds },
        $or: [{ companyName: rx }, { industry: rx }, { name: rx }],
      }).distinct('_id');
      conditions.push({
        $or: [
          { title: rx },
          { description: rx },
          { requirements: rx },
          { location: rx },
          { employerId: { $in: matchingEmployerIds } },
        ],
      });
    }

    const filter: Record<string, unknown> = {
      isActive: true,
      employerId: { $in: approvedEmployerIds },
      $and: conditions,
    };
    if (type && ['On-site', 'Remote', 'Hybrid'].includes(type)) {
      filter.type = type;
    }
    if (location) {
      filter.location = new RegExp(escapeRegex(location), 'i');
    }

    const total = await Job.countDocuments(filter);

    function withMatchScore(job: JobDoc) {
      const obj = plainJob(job);
      if (!matchProfile) return obj;
      return {
        ...obj,
        matchScore: computeMatchScore(
          matchProfile.skills,
          obj.requirements as string[] | undefined,
          matchProfile.preferredState,
          obj.location as string | undefined
        ),
      };
    }

    let jobs;
    if (sort === 'match' && matchProfile) {
      // Best-match sort is derived, not a DB field, so it can't be pushed
      // down to skip/limit -- score the full filtered set (capped, this is
      // a small platform) in memory, sort by score, then paginate.
      const candidates = await Job.find(filter)
        .populate('employerId', 'name companyName industry avatarUrl')
        .limit(500);
      jobs = candidates
        .map(withMatchScore)
        .sort((a, b) => (b.matchScore as number) - (a.matchScore as number))
        .slice((page - 1) * limit, (page - 1) * limit + limit);
    } else {
      const raw = await Job.find(filter)
        .populate('employerId', 'name companyName industry avatarUrl')
        .sort({ createdAt: sort === 'oldest' ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit);
      jobs = raw.map(withMatchScore);
    }

    return NextResponse.json(
      { jobs, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetching jobs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
