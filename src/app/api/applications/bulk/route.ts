import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Application from '@/models/Application';
import { requireSession } from '@/lib/mobileAuth';
import { notifyApplicationDecision } from '@/lib/notifyApplicationDecision';

const MAX_IDS = 100;

// PATCH { ids: string[], status }: accept/reject many pending applications
// in one call. Scoped to this employer's own still-pending applications --
// filtering on status: 'Pending' means a stale client selection can't
// re-trigger a decision (and its notification) on an application that was
// already decided.
export async function PATCH(req: Request) {
  try {
    const session = await requireSession(req);
    if (!session || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { ids, status } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No applications selected.' }, { status: 400 });
    }
    if (ids.length > MAX_IDS) {
      return NextResponse.json({ error: `Select at most ${MAX_IDS} applications at a time.` }, { status: 400 });
    }
    if (!['Accepted', 'Rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await connectToDatabase();

    const applications = await Application.find({
      _id: { $in: ids },
      employer: session.user.id,
      status: 'Pending',
    });

    if (applications.length === 0) {
      return NextResponse.json({ error: 'No matching pending applications found.' }, { status: 404 });
    }

    await Application.updateMany(
      { _id: { $in: applications.map((a) => a._id) } },
      { status }
    );

    // Best-effort per-recipient notifications; one failure never blocks
    // another, and none of them can fail the bulk update itself.
    await Promise.allSettled(applications.map((application) => notifyApplicationDecision(application, status)));

    return NextResponse.json({ modifiedCount: applications.length }, { status: 200 });
  } catch (error) {
    console.error('Applications bulk PATCH error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
