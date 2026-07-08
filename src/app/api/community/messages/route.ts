import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import CommunityMessage from '@/models/CommunityMessage';

const MAX_MESSAGE_LENGTH = 1000;
const RECENT_LIMIT = 100;

async function requireJoinedStudent(session: Session) {
  const user = await User.findById(session.user.id).select('communityJoined');
  if (!user?.communityJoined) return null;
  return user;
}

// GET: the shared community chat feed. Polling-based (no WebSockets) --
// pass ?since=<ISO timestamp> to fetch only messages newer than that for
// incremental polling; omit it for the initial recent-history load.
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const requester = await requireJoinedStudent(session);
    if (!requester) {
      return NextResponse.json({ error: 'Join the community first to view the chat.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const since = searchParams.get('since');

    const filter: Record<string, unknown> = {};
    if (since) {
      const sinceDate = new Date(since);
      if (!Number.isNaN(sinceDate.getTime())) {
        filter.createdAt = { $gt: sinceDate };
      }
    }

    const query = CommunityMessage.find(filter).populate('student', 'name').sort({ createdAt: since ? 1 : -1 });
    const messages = since ? await query : await query.limit(RECENT_LIMIT);

    // Without `since`, we fetched newest-first for the limit to bite the
    // right end -- flip back to chronological order for rendering.
    const ordered = since ? messages : messages.reverse();

    return NextResponse.json({ messages: ordered }, { status: 200 });
  } catch (error) {
    console.error('Community messages GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: post a message to the shared community chat feed.
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const requester = await requireJoinedStudent(session);
    if (!requester) {
      return NextResponse.json({ error: 'Join the community first to post.' }, { status: 403 });
    }

    const { text } = await req.json();
    const trimmed = (text || '').trim();
    if (!trimmed) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
    }
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).` }, { status: 400 });
    }

    const message = await CommunityMessage.create({ student: session.user.id, text: trimmed });
    await message.populate('student', 'name');

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Community messages POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
