import { NextResponse } from 'next/server';
import User from '@/models/User';
import Application from '@/models/Application';
import Logbook from '@/models/Logbook';
import { requireApprovedSchool, studentsOfSchoolFilter } from '@/lib/schoolAuth';

// GET: one student's full SIWES record for their school — profile,
// application history, and logbook. Only accessible when the student's
// university matches this school account, so a school can never open a
// student from another institution.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireApprovedSchool();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;

    const student = await User.findOne({ _id: id, ...studentsOfSchoolFilter(auth.school.name) }).select(
      'name email avatarUrl faculty courseOfStudy level phone skills resumeUrl siwesStartDate siwesDuration preferredState isProfileComplete createdAt'
    );
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    const [applications, logbook] = await Promise.all([
      Application.find({ student: student._id })
        .populate({ path: 'job', select: 'title location' })
        .populate('employer', 'companyName name')
        .sort({ createdAt: -1 }),
      Logbook.find({ studentId: student._id }).sort({ weekNumber: -1, date: -1 }),
    ]);

    return NextResponse.json({ student, applications, logbook }, { status: 200 });
  } catch (error) {
    console.error('School student detail GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
