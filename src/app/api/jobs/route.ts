import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Job from '@/models/Job';
import User from '@/models/User';

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
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    if (session.user.role === 'employer') {
      const jobs = await Job.find({ employerId: session.user.id }).sort({ createdAt: -1 });
      return NextResponse.json({ jobs }, { status: 200 });
    }

    // Public feed (students): only verified employers' active jobs.
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
      conditions.push({ $or: [{ title: rx }, { description: rx }] });
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
    const jobs = await Job.find(filter)
      .populate('employerId', 'name companyName industry')
      .sort({ createdAt: sort === 'oldest' ? 1 : -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json(
      { jobs, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) },
      { status: 200 }
    );
  } catch (error) {
    console.error('Fetching jobs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
