import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Connection from '@/models/Connection';

// POST: respond to an incoming connection request (accept or decline).
// Only the recipient of the request may respond to it.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action } = await req.json();
    if (!['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    }

    await connectToDatabase();

    const { id } = await params;
    const connection = await Connection.findById(id);

    if (!connection || connection.recipient.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Connection request not found.' }, { status: 404 });
    }
    if (connection.status !== 'pending') {
      return NextResponse.json({ error: 'This request has already been handled.' }, { status: 400 });
    }

    if (action === 'decline') {
      await connection.deleteOne();
      return NextResponse.json({ status: 'declined' }, { status: 200 });
    }

    connection.status = 'accepted';
    await connection.save();
    return NextResponse.json({ status: 'accepted', connection }, { status: 200 });
  } catch (error) {
    console.error('Connection respond POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
