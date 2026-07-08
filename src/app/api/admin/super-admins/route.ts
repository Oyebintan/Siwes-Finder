import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

// POST: promote an existing user to super_admin by email.
// Only callable by an existing super_admin -- mirrors the delete-permission
// hierarchy (only a super_admin can remove another super_admin's account).
// Body: { email: string }
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only a super admin can add another super admin.' }, { status: 403 });
    }

    const { email } = await req.json();
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return NextResponse.json(
        { error: 'No account found with that email. They need to sign up first, then you can promote them.' },
        { status: 404 }
      );
    }

    if (user.role === 'super_admin') {
      return NextResponse.json({ error: 'That user is already a super admin.' }, { status: 400 });
    }

    user.role = 'super_admin';
    await user.save();

    return NextResponse.json(
      { message: `${user.email} is now a super admin.`, user: { id: user._id, email: user.email, role: user.role } },
      { status: 200 }
    );
  } catch (error) {
    console.error('Admin super-admins POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
