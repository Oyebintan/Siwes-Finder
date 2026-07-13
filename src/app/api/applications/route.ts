import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Application from '@/models/Application';
import Job from '@/models/Job';
import User from '@/models/User';
import { isJobOpenForApplications } from '@/lib/jobStatus';
import { requireSession } from '@/lib/mobileAuth';

export async function POST(req: Request) {
  try {
    const session = await requireSession(req);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await req.json();
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
    }

    await connectToDatabase();

    const student = await User.findById(session.user.id);
    if (!student?.emailVerified) {
      return NextResponse.json(
        { error: 'Please verify your email address before applying.', code: 'EMAIL_NOT_VERIFIED' },
        { status: 403 }
      );
    }

    // Check if student has completed profile
    if (!student?.university || !student?.courseOfStudy || !student?.resumeUrl) {
      return NextResponse.json({ error: 'Please complete your profile (University, Course, and Resume) before applying.' }, { status: 400 });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // An unverified employer's job was never publicly visible — report it as
    // 404 so a direct API call can't confirm the listing exists.
    const employer = await User.findById(job.employerId);
    if (employer?.verificationStatus !== 'approved') {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Inactive, past its deadline, or at its applicant cap.
    if (!(await isJobOpenForApplications(job))) {
      return NextResponse.json({ error: 'This opportunity is no longer accepting applications.' }, { status: 400 });
    }

    // Email/external jobs are applied to off-platform; an in-app Application
    // record would never be seen by the employer.
    if (job.applicationMethod && job.applicationMethod !== 'platform') {
      return NextResponse.json(
        { error: 'This placement accepts applications outside the platform. Use the application link on the job page.' },
        { status: 400 }
      );
    }

    // Check if already applied
    const existingApp = await Application.findOne({ job: jobId, student: session.user.id });
    if (existingApp) {
      return NextResponse.json({ error: 'You have already applied for this placement' }, { status: 400 });
    }

    const application = await Application.create({
      job: jobId,
      student: session.user.id,
      employer: job.employerId,
      status: 'Pending'
    });

    // Keep the denormalized applicant count in sync, and close the job
    // immediately if this application just filled the last slot.
    job.applicantCount += 1;
    if (job.maxApplicants != null && job.applicantCount >= job.maxApplicants) {
      job.isActive = false;
    }
    await job.save();

    return NextResponse.json(application, { status: 201 });
  } catch (error) {
    // Duplicate key from the unique (job, student) index — a race with the
    // check above, or a concurrent double-submit. Return the friendly message.
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json({ error: 'You have already applied for this placement' }, { status: 400 });
    }
    console.error('Application POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await requireSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    if (session.user.role === 'student') {
      // Company name lives on the employer's User record, not on Job, so pull
      // it through a nested populate instead of selecting a field Job lacks.
      const apps = await Application.find({ student: session.user.id })
        .populate({
          path: 'job',
          select: 'title location employerId',
          populate: { path: 'employerId', select: 'companyName' },
        })
        .sort({ createdAt: -1 });
      return NextResponse.json(apps, { status: 200 });
    } else if (session.user.role === 'employer') {
      const apps = await Application.find({ employer: session.user.id })
        .populate('job', 'title')
        .populate('student', 'name email university courseOfStudy resumeUrl')
        .sort({ createdAt: -1 });
      return NextResponse.json(apps, { status: 200 });
    }

    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
