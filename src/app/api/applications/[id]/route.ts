import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Application from '@/models/Application';
import { requireSession } from '@/lib/mobileAuth';
import { notifyApplicationDecision } from '@/lib/notifyApplicationDecision';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession(req);
    if (!session || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status } = await req.json();
    if (!['Accepted', 'Rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await connectToDatabase();

    const { id } = await params;

    const application = await Application.findOneAndUpdate(
      { _id: id, employer: session.user.id },
      { status },
      { new: true }
    );

    if (!application) {
      return NextResponse.json({ error: 'Application not found or unauthorized' }, { status: 404 });
    }

    await notifyApplicationDecision(application, status);

    return NextResponse.json(application, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
