import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';
import { connectToDatabase } from '@/lib/mongodb';
import Job from '@/models/Job';

// POST: Create a new job placement (Employer only)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, location, type, duration, requirements, description, stipend } = body;

    await connectToDatabase();

    const newJob = await Job.create({
      employerId: session.user.id,
      title,
      location,
      type,
      duration,
      requirements,
      description,
      stipend,
    });

    return NextResponse.json(
      { message: 'Job posted successfully', job: newJob },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Job posting error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET: Fetch all active jobs (For students) or specific employer's jobs
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    let jobs;
    if (session.user.role === 'employer') {
      // Employer sees their own posted jobs
      jobs = await Job.find({ employerId: session.user.id }).sort({ createdAt: -1 });
    } else {
      // Student sees all active jobs, populated with employer name
      jobs = await Job.find({ isActive: true })
        .populate('employerId', 'name')
        .sort({ createdAt: -1 });
    }

    return NextResponse.json({ jobs }, { status: 200 });
  } catch (error: any) {
    console.error('Fetching jobs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
