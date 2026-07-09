import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import Logbook from '@/models/Logbook';
import Application from '@/models/Application';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { weekNumber, dayOfWeek, activityDescription, hoursWorked } = await req.json();

    // Validate up front so bad input gets a 400, not a 500 from the
    // Mongoose required-field/cast error it would otherwise trigger.
    const week = Number(weekNumber);
    const hours = Number(hoursWorked);
    if (
      !Number.isFinite(week) || week < 1 ||
      !dayOfWeek || typeof dayOfWeek !== 'string' ||
      !activityDescription || !String(activityDescription).trim() ||
      !Number.isFinite(hours) || hours < 1 || hours > 24
    ) {
      return NextResponse.json(
        { error: 'Week number, day, activity description and hours worked are all required.' },
        { status: 400 }
      );
    }

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
      weekNumber: week,
      dayOfWeek,
      activityDescription,
      hoursWorked: hours,
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    console.error("Logbook POST error:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Logbooks are a private record for the student -- employers no longer have
// any visibility into them (students export their own as a PDF instead, to
// submit to their lecturer/SIWES office directly).
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const logs = await Logbook.find({ studentId: session.user.id }).sort({ weekNumber: -1, date: -1 });
    return NextResponse.json(logs, { status: 200 });
  } catch (error) {
    console.error("Logbook GET error:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
