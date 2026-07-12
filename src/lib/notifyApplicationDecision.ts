import User from '@/models/User';
import Job from '@/models/Job';
import { sendPushNotification } from '@/lib/push';
import { sendApplicationDecisionEmail } from '@/lib/email';

type DecidedApplication = {
  _id: { toString(): string };
  student: { toString(): string };
  job: { toString(): string };
};

// Best-effort notification (push to the mobile app if a token is
// registered, email always) for an application decision -- shared by
// PUT /api/applications/[id] (single) and PATCH /api/applications/bulk.
// A delivery failure must never fail the status update itself, so the
// lookups and each channel's send are all wrapped separately: a push
// problem shouldn't stop the email, and neither should ever turn an
// already-committed decision into a 500 for the caller.
export async function notifyApplicationDecision(
  application: DecidedApplication,
  status: 'Accepted' | 'Rejected'
): Promise<void> {
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
}
