import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Application from '@/models/Application';

// GET: the opt-in student directory. Only visible to students who have
// themselves joined the community (matches the "you're not alone" spirit --
// you see peers once you're one of them).
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const requester = await User.findById(session.user.id).select('communityJoined');
    if (!requester?.communityJoined) {
      return NextResponse.json({ error: 'Join the community first to see other students.' }, { status: 403 });
    }

    const students = await User.find({ role: 'student', communityJoined: true })
      .select('name university courseOfStudy')
      .sort({ name: 1 });

    const studentIds = students.map((s) => s._id);
    const acceptedApps = await Application.find({ student: { $in: studentIds }, status: 'Accepted' })
      .select('student employer')
      .populate('employer', 'companyName name');

    const companyByStudentId = new Map(
      acceptedApps.map((app) => [
        app.student.toString(),
        (app.employer as { companyName?: string; name?: string } | undefined)?.companyName ||
          (app.employer as { companyName?: string; name?: string } | undefined)?.name ||
          'a company',
      ])
    );

    const directory = students.map((s) => {
      const company = companyByStudentId.get(s._id.toString());
      return {
        id: s._id,
        name: s.name,
        university: s.university || null,
        courseOfStudy: s.courseOfStudy || null,
        isCurrentlyOnSiwes: Boolean(company),
        status: company ? `On SIWES at ${company}` : 'Not yet placed',
      };
    });

    return NextResponse.json({ students: directory }, { status: 200 });
  } catch (error) {
    console.error('Community students GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
