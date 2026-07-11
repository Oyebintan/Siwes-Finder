import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Application from '@/models/Application';
import Job from '@/models/Job';
import User from '@/models/User';
import { requireSession } from '@/lib/mobileAuth';
import { sendPushNotification } from '@/lib/push';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(req);
    if (!session || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status } = await req.json();
    if (!['Accepted', 'Rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await connectToDatabase();

    const { id } = await params;

    const application = await Application.findOneAndUpdate(
      { _id: id, employer: session.user.id },
      { status },
      { new: true }
    );

    if (!application) {
      return NextResponse.json({ error: 'Application not found or unauthorized' }, { status: 404 });
    }

    // Best-effort push notification -- a delivery failure (no token
    // registered, device unreachable, etc.) must never fail the status
    // update itself, so errors are logged and swallowed here.
    try {
      const student = await User.findById(application.student).select('expoPushToken');
      if (student?.expoPushToken) {
        const job = await Job.findById(application.job).select('title');
        const jobLabel = job?.title ? ` for ${job.title}` : '';
        await sendPushNotification(
          student.expoPushToken,
          status === 'Accepted' ? 'Application accepted 🎉' : 'Application update',
          status === 'Accepted'
            ? `Great news! Your application${jobLabel} was accepted.`
            : `Your application${jobLabel} was not selected this time.`,
          { type: 'application-status', applicationId: application._id.toString() }
        );
      }
    } catch (pushError) {
      console.error('Failed to send application status push:', pushError);
    }

    return NextResponse.json(application, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
