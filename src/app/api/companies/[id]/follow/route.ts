import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { requireSession } from '@/lib/mobileAuth';

// GET: whether the current student follows this employer -- used by
// FollowCompanyButton to render its initial state.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(req);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { id } = await params;
    const user = await User.findById(session.user.id).select('followedEmployers');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const following = (user.followedEmployers || []).some(
      (employerId: { toString(): string }) => employerId.toString() === id
    );

    return NextResponse.json({ following }, { status: 200 });
  } catch (error) {
    console.error('Company follow GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: toggle the current student's follow state for this employer.
// Returns { following } -- the state after the toggle.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(req);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { id } = await params;

    const employer = await User.findOne({ _id: id, role: 'employer' }).select('_id');
    if (!employer) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const user = await User.findById(session.user.id).select('followedEmployers');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const alreadyFollowing = (user.followedEmployers || []).some(
      (employerId: { toString(): string }) => employerId.toString() === id
    );

    await User.findByIdAndUpdate(
      session.user.id,
      alreadyFollowing ? { $pull: { followedEmployers: id } } : { $addToSet: { followedEmployers: id } }
    );

    return NextResponse.json({ following: !alreadyFollowing }, { status: 200 });
  } catch (error) {
    console.error('Company follow POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
