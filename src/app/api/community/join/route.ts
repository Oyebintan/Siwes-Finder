import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

// POST: a student opts in to the Community directory/chat. Explicit
// opt-in only -- students are never auto-listed.
export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const user = await User.findByIdAndUpdate(
      session.user.id,
      { $set: { communityJoined: true } },
      { new: true }
    ).select('communityJoined');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ communityJoined: user.communityJoined }, { status: 200 });
  } catch (error) {
    console.error('Community join POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
