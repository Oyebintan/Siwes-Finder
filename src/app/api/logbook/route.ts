import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Logbook from '@/models/Logbook';
import Application from '@/models/Application';
import Student from '@/models/Student';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { weekNumber, dayOfWeek, activityDescription, hoursWorked } = await req.json();

    await connectToDatabase();
    const studentProfile = await Student.findOne({ userId: session.user.id });
    
    if (!studentProfile) {
       return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    // Find the accepted application to know the employer
    const acceptedApp = await Application.findOne({ 
      studentId: studentProfile._id, 
      status: 'Accepted' 
    });

    if (!acceptedApp) {
      return NextResponse.json({ error: 'You must have an accepted IT placement to write a logbook.' }, { status: 403 });
    }

    const log = await Logbook.create({
      studentId: studentProfile._id,
      employerId: acceptedApp.employerId,
      weekNumber,
      dayOfWeek,
      activityDescription,
      hoursWorked,
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectToDatabase();

    if (session.user.role === 'student') {
      const studentProfile = await Student.findOne({ userId: session.user.id });
      if (!studentProfile) return NextResponse.json([], { status: 200 });

      const logs = await Logbook.find({ studentId: studentProfile._id }).sort({ weekNumber: -1, date: -1 });
      return NextResponse.json(logs, { status: 200 });
    } else {
      // Employer fetching logs from all their students
      const logs = await Logbook.find({ employerId: session.user.id })
        .populate({ path: 'studentId', populate: { path: 'userId', select: 'name email' } })
        .sort({ isApproved: 1, date: -1 });
      return NextResponse.json(logs, { status: 200 });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
