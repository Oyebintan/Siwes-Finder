import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Job from '@/models/Job';
import Application from '@/models/Application';
import User from '@/models/User';
import { isAdminRole } from '@/lib/roles';
import { isJobOpenForApplications } from '@/lib/jobStatus';
import { requireSession } from '@/lib/mobileAuth';
import { sendJobTakedownEmail } from '@/lib/email';

// GET one job. Owners (and admins) always see it; everyone else only sees
// active jobs from verified employers.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;

    const job = await Job.findById(id).populate('employerId', 'name companyName industry verificationStatus avatarUrl');
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const employer = job.employerId as unknown as {
      _id?: { toString(): string };
      verificationStatus?: string;
    } | null;
    const isOwner = employer?._id?.toString() === session.user.id;
    const isAdmin = isAdminRole(session.user.role);
    if (!isOwner && !isAdmin) {
      const openForApplications = await isJobOpenForApplications(job);
      if (!openForApplications || employer?.verificationStatus !== 'approved') {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ job }, { status: 200 });
  } catch (error) {
    console.error('Job GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PUT: edit / deactivate a job (owning employer only).
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    await connectToDatabase();
    const { id } = await params;

    const job = await Job.findOne({ _id: id, employerId: session.user.id });
    if (!job) {
      return NextResponse.json({ error: 'Job not found or unauthorized' }, { status: 404 });
    }

    const editable = ['title', 'location', 'type', 'duration', 'requirements', 'description', 'stipend', 'isActive'] as const;
    for (const field of editable) {
      if (body[field] !== undefined) job.set(field, body[field]);
    }

    if (body.applicationDeadline !== undefined) {
      if (body.applicationDeadline === null || body.applicationDeadline === '') {
        job.applicationDeadline = undefined;
      } else {
        const parsed = new Date(body.applicationDeadline);
        if (Number.isNaN(parsed.getTime())) {
          return NextResponse.json({ error: 'Invalid application deadline.' }, { status: 400 });
        }
        job.applicationDeadline = parsed;
      }
    }

    if (body.maxApplicants !== undefined) {
      if (body.maxApplicants === null || body.maxApplicants === '') {
        job.maxApplicants = undefined;
      } else {
        const parsed = Number(body.maxApplicants);
        if (!Number.isInteger(parsed) || parsed < 1) {
          return NextResponse.json({ error: 'Maximum applicants must be a positive whole number.' }, { status: 400 });
        }
        job.maxApplicants = parsed;
      }
    }

    // Re-validate application method if it's being changed.
    if (body.applicationMethod !== undefined) {
      const method = body.applicationMethod;
      if (!['platform', 'email', 'external'].includes(method)) {
        return NextResponse.json({ error: 'Invalid application method.' }, { status: 400 });
      }
      if (method === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.applicationEmail || '')) {
        return NextResponse.json({ error: 'A valid application email is required for email applications.' }, { status: 400 });
      }
      if (method === 'external' && !/^https?:\/\/.+/i.test(body.applicationUrl || '')) {
        return NextResponse.json({ error: 'A valid application URL (http/https) is required for external applications.' }, { status: 400 });
      }
      job.applicationMethod = method;
      job.applicationEmail = method === 'email' ? body.applicationEmail : undefined;
      job.applicationUrl = method === 'external' ? body.applicationUrl : undefined;
    }

    await job.save();
    return NextResponse.json({ message: 'Job updated', job }, { status: 200 });
  } catch (error) {
    console.error('Job PUT error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE: remove a job and its applications. Owning employer or an admin.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;

    const isAdmin = isAdminRole(session.user.role);
    const query = isAdmin ? { _id: id } : { _id: id, employerId: session.user.id };

    const job = await Job.findOne(query);
    if (!job) {
      return NextResponse.json({ error: 'Job not found or unauthorized' }, { status: 404 });
    }

    // Admin takedown of someone else's listing: tell the employer, same
    // best-effort pattern as every other notification email -- a failed
    // send never blocks the moderation action itself.
    const isTakedown = isAdmin && String(job.employerId) !== session.user.id;
    if (isTakedown) {
      try {
        const employer = await User.findById(job.employerId).select('name companyName email');
        if (employer?.email) {
          await sendJobTakedownEmail(employer.email, employer.companyName || employer.name, job.title);
        }
      } catch (emailError) {
        console.error('Failed to send job takedown email:', emailError);
      }
    }

    await Application.deleteMany({ job: job._id });
    await job.deleteOne();

    return NextResponse.json({ message: 'Job deleted' }, { status: 200 });
  } catch (error) {
    console.error('Job DELETE error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
