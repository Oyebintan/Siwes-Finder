import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Connection from '@/models/Connection';

async function requireJoinedStudent(session: Session) {
  const user = await User.findById(session.user.id).select('communityJoined');
  if (!user?.communityJoined) return null;
  return user;
}

// GET: my connections, split into accepted / incoming pending / outgoing pending.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const requester = await requireJoinedStudent(session);
    if (!requester) {
      return NextResponse.json({ error: 'Join the community first to connect with other students.' }, { status: 403 });
    }

    const meId = session.user.id;
    const connections = await Connection.find({ $or: [{ requester: meId }, { recipient: meId }] })
      .populate('requester', 'name university courseOfStudy')
      .populate('recipient', 'name university courseOfStudy')
      .sort({ createdAt: -1 });

    const accepted: unknown[] = [];
    const incomingPending: unknown[] = [];
    const outgoingPending: unknown[] = [];

    for (const conn of connections) {
      const isRequester = conn.requester._id.toString() === meId;
      const peer = isRequester ? conn.recipient : conn.requester;
      const entry = { connectionId: conn._id, peer };

      if (conn.status === 'accepted') {
        accepted.push(entry);
      } else if (isRequester) {
        outgoingPending.push(entry);
      } else {
        incomingPending.push(entry);
      }
    }

    return NextResponse.json({ accepted, incomingPending, outgoingPending }, { status: 200 });
  } catch (error) {
    console.error('Connections GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: send a connection request to another student. If that student already
// requested us, accept theirs instead of creating a duplicate/competing one.
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const requester = await requireJoinedStudent(session);
    if (!requester) {
      return NextResponse.json({ error: 'Join the community first to connect with other students.' }, { status: 403 });
    }

    const { studentId } = await req.json();
    const meId = session.user.id;

    if (!studentId || studentId === meId) {
      return NextResponse.json({ error: 'Invalid student.' }, { status: 400 });
    }

    const target = await User.findById(studentId).select('role communityJoined');
    if (!target || target.role !== 'student' || !target.communityJoined) {
      return NextResponse.json({ error: 'That student is not available to connect with.' }, { status: 404 });
    }

    const existing = await Connection.findOne({
      $or: [
        { requester: meId, recipient: studentId },
        { requester: studentId, recipient: meId },
      ],
    });

    if (existing) {
      if (existing.status === 'accepted') {
        return NextResponse.json({ error: 'You are already connected with this student.' }, { status: 400 });
      }
      if (existing.requester.toString() === meId) {
        return NextResponse.json({ error: 'Connection request already sent.' }, { status: 400 });
      }
      // They already requested us -- treat this as accepting theirs.
      existing.status = 'accepted';
      await existing.save();
      return NextResponse.json({ connection: existing, status: 'accepted' }, { status: 200 });
    }

    const connection = await Connection.create({ requester: meId, recipient: studentId, status: 'pending' });
    return NextResponse.json({ connection, status: 'pending' }, { status: 201 });
  } catch (error) {
    console.error('Connections POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
