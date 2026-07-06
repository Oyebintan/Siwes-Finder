import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Logbook from '@/models/Logbook';
import Application from '@/models/Application';
import User from '@/models/User';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { weekNumber, dayOfWeek, activityDescription, hoursWorked } = await req.json();

    await connectToDatabase();

    // Find the accepted application to know the employer
    const acceptedApp = await Application.findOne({ 
      student: session.user.id, 
      status: 'Accepted' 
    });

    if (!acceptedApp) {
      return NextResponse.json({ error: 'You must have an accepted IT placement to write a logbook.' }, { status: 403 });
    }

    const log = await Logbook.create({
      studentId: session.user.id,
      employerId: acceptedApp.employer,
      weekNumber,
      dayOfWeek,
      activityDescription,
      hoursWorked,
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("Logbook POST error:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();

    if (session.user.role === 'student') {
      const logs = await Logbook.find({ studentId: session.user.id }).sort({ weekNumber: -1, date: -1 });
      return NextResponse.json(logs, { status: 200 });
    } else {
      // Employer fetching logs from all their students
      const logs = await Logbook.find({ employerId: session.user.id })
        .populate('studentId', 'name email')
        .sort({ isApproved: 1, date: -1 });
      return NextResponse.json(logs, { status: 200 });
    }
  } catch (error) {
    console.error("Logbook GET error:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
