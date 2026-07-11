import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import Logbook from '@/models/Logbook';
import Application from '@/models/Application';
import { requireSession } from '@/lib/mobileAuth';

export async function POST(req: Request) {
  try {
    const session = await requireSession(req);
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

// A student sees only their own entries. An employer sees every entry tied
// to their placements (unapproved-first, so what needs review surfaces at
// the top) -- see PUT /api/logbook/[id] for the approval action itself.
export async function GET(req: Request) {
  try {
    const session = await requireSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    if (session.user.role === 'student') {
      const logs = await Logbook.find({ studentId: session.user.id }).sort({ weekNumber: -1, date: -1 });
      return NextResponse.json(logs, { status: 200 });
    }

    if (session.user.role === 'employer') {
      const logs = await Logbook.find({ employerId: session.user.id })
        .populate('studentId', 'name email')
        .sort({ isApproved: 1, date: -1 });
      return NextResponse.json(logs, { status: 200 });
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  } catch (error) {
    console.error("Logbook GET error:", error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
