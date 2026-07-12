import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Application from '@/models/Application';
import Job from '@/models/Job';
import User from '@/models/User';
import { requireSession } from '@/lib/mobileAuth';
import { sendPushNotification } from '@/lib/push';
import { sendApplicationDecisionEmail } from '@/lib/email';

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

    // Best-effort notifications (push to the mobile app if a token is
    // registered, email always) -- a delivery failure must never fail the
    // status update itself, so the lookups and each channel's send are all
    // wrapped separately: a push problem shouldn't stop the email, and
    // neither should ever turn an already-committed decision into a 500.
    type Recipient = { expoPushToken?: string; email?: string; name?: string };
    let student: Recipient | null = null;
    let jobTitle: string | undefined;
    try {
      student = (await User.findById(application.student).select(
        'expoPushToken email name'
      )) as Recipient | null;
      const job = await Job.findById(application.job).select('title');
      jobTitle = job?.title;
    } catch (lookupError) {
      console.error('Failed to load notification recipients:', lookupError);
    }

    try {
      if (student?.expoPushToken) {
        const jobLabel = jobTitle ? ` for ${jobTitle}` : '';
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

    try {
      if (student?.email) {
        await sendApplicationDecisionEmail(
          student.email,
          student.name || 'there',
          jobTitle || 'a placement',
          status
        );
      }
    } catch (emailError) {
      console.error('Failed to send application status email:', emailError);
    }

    return NextResponse.json(application, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
