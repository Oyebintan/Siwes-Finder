import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Connection from '@/models/Connection';
import DirectMessage from '@/models/DirectMessage';

const MAX_MESSAGE_LENGTH = 1000;
const RECENT_LIMIT = 100;

async function requireAcceptedConnection(meId: string, peerId: string) {
  return Connection.findOne({
    status: 'accepted',
    $or: [
      { requester: meId, recipient: peerId },
      { requester: peerId, recipient: meId },
    ],
  });
}

// GET: a 1:1 direct-message thread with a connected student. Polling-based,
// same ?since= convention as the community chat feed.
export async function GET(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { studentId } = await params;
    const meId = session.user.id;

    const connection = await requireAcceptedConnection(meId, studentId);
    if (!connection) {
      return NextResponse.json({ error: 'You are not connected with this student.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const since = searchParams.get('since');

    const filter: Record<string, unknown> = {
      $or: [
        { from: meId, to: studentId },
        { from: studentId, to: meId },
      ],
    };
    if (since) {
      const sinceDate = new Date(since);
      if (!Number.isNaN(sinceDate.getTime())) {
        filter.createdAt = { $gt: sinceDate };
      }
    }

    const query = DirectMessage.find(filter).sort({ createdAt: since ? 1 : -1 });
    const messages = since ? await query : await query.limit(RECENT_LIMIT);
    const ordered = since ? messages : messages.reverse();

    return NextResponse.json({ messages: ordered }, { status: 200 });
  } catch (error) {
    console.error('Direct messages GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: send a direct message to a connected student.
export async function POST(req: Request, { params }: { params: Promise<{ studentId: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { studentId } = await params;
    const meId = session.user.id;

    const connection = await requireAcceptedConnection(meId, studentId);
    if (!connection) {
      return NextResponse.json({ error: 'You are not connected with this student.' }, { status: 403 });
    }

    const { text } = await req.json();
    const trimmed = (text || '').trim();
    if (!trimmed) {
      return NextResponse.json({ error: 'Message cannot be empty.' }, { status: 400 });
    }
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).` }, { status: 400 });
    }

    const message = await DirectMessage.create({ from: meId, to: studentId, text: trimmed });
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error('Direct messages POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
