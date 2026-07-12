import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Application from '@/models/Application';
import Message from '@/models/Message';
import User from '@/models/User';
import { requireSession } from '@/lib/mobileAuth';
import { sendPushNotification } from '@/lib/push';
import { sendNewMessageEmail } from '@/lib/email';

type SessionUser = { id: string; role: string };

// Loads the application and confirms the caller is one of its two parties
// (the student who applied, or the employer who owns the listing). Returns
// null for both "doesn't exist" and "not your application" -- the caller
// gets a flat 404 either way, same as the existing PUT /api/applications/[id]
// pattern, so a probing request can't distinguish the two cases.
async function loadAuthorizedApplication(applicationId: string, user: SessionUser) {
  if (user.role !== 'student' && user.role !== 'employer') return null;

  const application = await Application.findById(applicationId).populate('job', 'title');
  if (!application) return null;

  const owns =
    (user.role === 'student' && application.student.toString() === user.id) ||
    (user.role === 'employer' && application.employer.toString() === user.id);

  return owns ? application : null;
}

// GET: the full thread for this application, oldest first. Also marks
// every message from the other party as read -- the reader is only ever
// marking messages addressed *to* them, never their own.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { id } = await params;
    const application = await loadAuthorizedApplication(id, session.user);
    if (!application) {
      return NextResponse.json({ error: 'Application not found or unauthorized' }, { status: 404 });
    }

    const messages = await Message.find({ application: id })
      .populate('sender', 'name')
      .sort({ createdAt: 1 });

    try {
      await Message.updateMany(
        { application: id, senderRole: { $ne: session.user.role }, read: false },
        { read: true }
      );
    } catch (markReadError) {
      // Never fail the thread fetch over a read-receipt update.
      console.error('Failed to mark messages read:', markReadError);
    }

    return NextResponse.json({ messages }, { status: 200 });
  } catch (error) {
    console.error('Messages GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST { body }: post a message into the thread.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { id } = await params;
    const application = await loadAuthorizedApplication(id, session.user);
    if (!application) {
      return NextResponse.json({ error: 'Application not found or unauthorized' }, { status: 404 });
    }

    const { body } = await req.json();
    const trimmed = typeof body === 'string' ? body.trim() : '';
    if (!trimmed) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
    }
    if (trimmed.length > 2000) {
      return NextResponse.json({ error: 'Message is too long (2000 characters max).' }, { status: 400 });
    }

    const senderRole = session.user.role as 'student' | 'employer';
    const message = await Message.create({
      application: id,
      sender: session.user.id,
      senderRole,
      body: trimmed,
    });

    // Best-effort notification to the other party -- never fails the send.
    try {
      const recipientId = senderRole === 'student' ? application.employer : application.student;
      const recipientRole: 'student' | 'employer' = senderRole === 'student' ? 'employer' : 'student';
      const [recipient, sender] = await Promise.all([
        User.findById(recipientId).select('email name expoPushToken'),
        User.findById(session.user.id).select('name'),
      ]);
      const senderName = sender?.name || 'Someone';
      const jobTitle = (application.job as unknown as { title?: string })?.title || 'your application';

      try {
        if (recipient?.expoPushToken) {
          await sendPushNotification(
            recipient.expoPushToken,
            `New message from ${senderName}`,
            trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed,
            { type: 'new-message', applicationId: id }
          );
        }
      } catch (pushError) {
        console.error('Failed to send new-message push:', pushError);
      }

      try {
        if (recipient?.email) {
          await sendNewMessageEmail(recipient.email, recipient.name || 'there', senderName, jobTitle, recipientRole);
        }
      } catch (emailError) {
        console.error('Failed to send new-message email:', emailError);
      }
    } catch (notifyError) {
      console.error('Failed to notify recipient of new message:', notifyError);
    }

    const populated = await Message.findById(message._id).populate('sender', 'name');
    return NextResponse.json({ message: populated }, { status: 201 });
  } catch (error) {
    console.error('Messages POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
