import { NextResponse } from 'next/server';
import User from '@/models/User';
import Application from '@/models/Application';
import Logbook from '@/models/Logbook';
import { requireApprovedSchool, studentsOfSchoolFilter } from '@/lib/schoolAuth';

// GET: every student registered under this school's institution name, with
// their placement status and logbook counts — the data a SIWES coordinator
// tracks. The client groups by department (courseOfStudy) / faculty.
export async function GET(req: Request) {
  try {
    const auth = await requireApprovedSchool(req);
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const students = await User.find(studentsOfSchoolFilter(auth.school.name))
      .select('name email avatarUrl faculty courseOfStudy level phone skills resumeUrl isProfileComplete createdAt')
      .sort({ courseOfStudy: 1, name: 1 });

    const studentIds = students.map((s) => s._id);

    const [acceptedApps, appCounts, logCounts] = await Promise.all([
      // Who is placed, and where.
      Application.find({ student: { $in: studentIds }, status: 'Accepted' })
        .populate('employer', 'companyName name')
        .select('student employer'),
      Application.aggregate([
        { $match: { student: { $in: studentIds } } },
        { $group: { _id: '$student', total: { $sum: 1 } } },
      ]),
      Logbook.aggregate([
        { $match: { studentId: { $in: studentIds } } },
        {
          $group: {
            _id: '$studentId',
            total: { $sum: 1 },
            approved: { $sum: { $cond: ['$isApproved', 1, 0] } },
          },
        },
      ]),
    ]);

    const placementByStudent = new Map(
      acceptedApps.map((a) => {
        const employer = a.employer as unknown as { companyName?: string; name?: string } | null;
        return [String(a.student), employer?.companyName || employer?.name || 'Unknown company'];
      })
    );
    const appsByStudent = new Map(appCounts.map((c: { _id: unknown; total: number }) => [String(c._id), c.total]));
    const logsByStudent = new Map(
      logCounts.map((c: { _id: unknown; total: number; approved: number }) => [String(c._id), c])
    );

    const result = students.map((s) => {
      const id = String(s._id);
      const logs = logsByStudent.get(id);
      return {
        _id: id,
        name: s.name,
        email: s.email,
        avatarUrl: s.avatarUrl,
        faculty: s.faculty,
        department: s.courseOfStudy || 'Unassigned department',
        level: s.level,
        isProfileComplete: s.isProfileComplete,
        placedAt: placementByStudent.get(id) || null,
        applicationCount: appsByStudent.get(id) || 0,
        logbookEntries: logs?.total || 0,
        logbookApproved: logs?.approved || 0,
      };
    });

    return NextResponse.json({ students: result, school: auth.school.name }, { status: 200 });
  } catch (error) {
    console.error('School students GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
