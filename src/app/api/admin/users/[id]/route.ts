import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import Job from '@/models/Job';
import Application from '@/models/Application';
import { isAdminRole } from '@/lib/roles';

// DELETE: remove a user and their related data (admin only).
// Employers: their jobs and the applications to those jobs.
// Students: their applications.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const { id } = await params;

    if (id === session.user.id) {
      return NextResponse.json({ error: 'You cannot delete your own admin account.' }, { status: 400 });
    }

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // A plain admin can't remove a super_admin; only another super_admin can.
    if (user.role === 'super_admin' && session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only a super admin can delete a super admin account.' }, { status: 403 });
    }

    if (user.role === 'employer') {
      const jobs = await Job.find({ employerId: user._id }).select('_id');
      const jobIds = jobs.map((j) => j._id);
      await Application.deleteMany({ job: { $in: jobIds } });
      await Job.deleteMany({ employerId: user._id });
    } else if (user.role === 'student') {
      await Application.deleteMany({ student: user._id });
    }

    await user.deleteOne();

    return NextResponse.json({ message: 'User deleted' }, { status: 200 });
  } catch (error) {
    console.error('Admin user DELETE error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
