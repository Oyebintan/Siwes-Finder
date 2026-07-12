import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Logbook from '@/models/Logbook';
import User from '@/models/User';
import { requireSession } from '@/lib/mobileAuth';
import { sendPushNotification } from '@/lib/push';
import { sendLogbookApprovalEmail } from '@/lib/email';

// PUT: the owning employer marks one of their students' entries approved.
// Scoped to { _id, employerId } so an employer can only approve entries tied
// to their own placements.
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(req);
    if (!session || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { id } = await params;

    const log = await Logbook.findOneAndUpdate(
      { _id: id, employerId: session.user.id },
      { isApproved: true },
      { new: true }
    );

    if (!log) {
      return NextResponse.json({ error: 'Logbook not found or unauthorized' }, { status: 404 });
    }

    // Best-effort notifications (push + email), same pattern as
    // PUT /api/applications/[id] -- lookups and each channel wrapped
    // separately so no delivery failure ever fails the approval itself.
    // Looked up separately (not via populate on the response) so the push
    // token never appears in the JSON sent back to the employer's client.
    type Recipient = { expoPushToken?: string; email?: string; name?: string };
    let student: Recipient | null = null;
    try {
      student = (await User.findById(log.studentId).select(
        'expoPushToken email name'
      )) as Recipient | null;
    } catch (lookupError) {
      console.error('Failed to load notification recipient:', lookupError);
    }

    try {
      if (student?.expoPushToken) {
        await sendPushNotification(
          student.expoPushToken,
          'Logbook entry approved ✓',
          `Week ${log.weekNumber} · ${log.dayOfWeek} was approved by your employer.`,
          { type: 'logbook-approval', logbookId: log._id.toString() }
        );
      }
    } catch (pushError) {
      console.error('Failed to send logbook approval push:', pushError);
    }

    try {
      if (student?.email) {
        await sendLogbookApprovalEmail(student.email, student.name || 'there', log.weekNumber, log.dayOfWeek);
      }
    } catch (emailError) {
      console.error('Failed to send logbook approval email:', emailError);
    }

    return NextResponse.json(log, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
