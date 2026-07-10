import { NextResponse } from 'next/server';
import User from '@/models/User';
import Logbook from '@/models/Logbook';
import { requireApprovedSchool, studentsOfSchoolFilter } from '@/lib/schoolAuth';

// GET: every logbook entry written by this school's students, newest first --
// the same oversight employers get, but across the whole institution instead
// of one company's interns. Read-only: approval stays an employer action.
// ?department=<courseOfStudy>  &  ?status=approved|pending
export async function GET(req: Request) {
  try {
    const auth = await requireApprovedSchool();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const students = await User.find(studentsOfSchoolFilter(auth.school.name)).select('name courseOfStudy faculty');
    const studentIds = students.map((s) => s._id);
    const studentById = new Map(students.map((s) => [String(s._id), s]));

    const { searchParams } = new URL(req.url);
    const department = (searchParams.get('department') || '').trim();
    const status = (searchParams.get('status') || '').trim();

    const filter: Record<string, unknown> = { studentId: { $in: studentIds } };
    if (status === 'approved') filter.isApproved = true;
    else if (status === 'pending') filter.isApproved = false;

    const entries = await Logbook.find(filter).sort({ date: -1 });

    const enriched = entries
      .map((log) => {
        const student = studentById.get(String(log.studentId));
        return {
          _id: log._id,
          weekNumber: log.weekNumber,
          dayOfWeek: log.dayOfWeek,
          activityDescription: log.activityDescription,
          hoursWorked: log.hoursWorked,
          isApproved: log.isApproved,
          date: log.date,
          studentId: student?._id,
          studentName: student?.name || 'Unknown student',
          department: student?.courseOfStudy || 'Unassigned department',
          faculty: student?.faculty,
        };
      })
      // department filter applied after enrichment since it lives on the student, not the log.
      .filter((log) => !department || log.department === department);

    const departments = [...new Set(students.map((s) => s.courseOfStudy || 'Unassigned department'))].sort();

    return NextResponse.json({ entries: enriched, departments }, { status: 200 });
  } catch (error) {
    console.error('School logbooks GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
