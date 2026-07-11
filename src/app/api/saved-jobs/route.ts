import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Job from '@/models/Job';
import { requireSession } from '@/lib/mobileAuth';

// GET: the student's saved jobs.
// ?ids=1 returns just the id list (cheap bookmark-state check for cards);
// the default returns full job cards, filtered to listings that are still
// publicly visible (active + verified employer), same as the browse feed.
export async function GET(req: Request) {
  try {
    const session = await requireSession(req);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findById(session.user.id).select('savedJobs');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const ids = (user.savedJobs || []).map((id: { toString(): string }) => id.toString());

    const { searchParams } = new URL(req.url);
    if (searchParams.get('ids')) {
      return NextResponse.json({ ids }, { status: 200 });
    }

    const approvedEmployerIds = await User.find({
      role: 'employer',
      verificationStatus: 'approved',
    }).distinct('_id');

    const jobs = await Job.find({
      _id: { $in: ids },
      isActive: true,
      employerId: { $in: approvedEmployerIds },
    })
      .populate('employerId', 'name companyName industry avatarUrl')
      .sort({ createdAt: -1 });

    return NextResponse.json({ jobs, ids }, { status: 200 });
  } catch (error) {
    console.error('Saved jobs GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST { jobId }: toggle a job's saved state. Returns { saved } — the state
// after the toggle — so the UI can render without a follow-up fetch.
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

    const job = await Job.findById(jobId).select('_id');
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const user = await User.findById(session.user.id).select('savedJobs');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const alreadySaved = (user.savedJobs || []).some(
      (id: { toString(): string }) => id.toString() === String(jobId)
    );

    // $addToSet / $pull are atomic, so concurrent toggles can't corrupt the list.
    await User.findByIdAndUpdate(
      session.user.id,
      alreadySaved ? { $pull: { savedJobs: jobId } } : { $addToSet: { savedJobs: jobId } }
    );

    return NextResponse.json({ saved: !alreadySaved }, { status: 200 });
  } catch (error) {
    console.error('Saved jobs POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
