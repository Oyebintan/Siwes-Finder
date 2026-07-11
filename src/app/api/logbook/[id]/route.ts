import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Logbook from '@/models/Logbook';
import User from '@/models/User';
import { requireSession } from '@/lib/mobileAuth';
import { sendPushNotification } from '@/lib/push';

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

    // Best-effort push, same pattern as the application-decision push in
    // PUT /api/applications/[id] -- a delivery failure never fails the
    // approval itself. Looked up separately (not via populate on the
    // response) so the push token never appears in the JSON sent back to
    // the employer's client.
    try {
      const student = await User.findById(log.studentId).select('expoPushToken');
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

    return NextResponse.json(log, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
