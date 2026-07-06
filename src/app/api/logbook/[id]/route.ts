import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Logbook from '@/models/Logbook';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    
    // Only allow employer who owns this placement to approve
    const log = await Logbook.findOneAndUpdate(
      { _id: params.id, employerId: session.user.id },
      { isApproved: true },
      { new: true }
    );

    if (!log) {
      return NextResponse.json({ error: 'Logbook not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json(log, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
