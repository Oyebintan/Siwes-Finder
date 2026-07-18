import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/mobileAuth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

// Serves both the web's cookie session (post-Google-signup role picker at
// /onboarding) and the mobile app's bearer token (role-picker.tsx) --
// requireSession() resolves whichever the caller sent (see mobileAuth.ts).
export async function POST(req: Request) {
  try {
    const session = await requireSession(req);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role } = await req.json();

    if (!['student', 'employer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    await connectToDatabase();

    // This endpoint is only for the first-time "how will you use this
    // platform?" picker (brand-new Google sign-ins with role 'unassigned').
    // Never let it downgrade an account that already has a real role --
    // most importantly, an admin should never lose that role this way.
    const existing = await User.findById(session.user.id).select('role');
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (existing.role !== 'unassigned') {
      return NextResponse.json({ error: 'Role is already set and cannot be changed here.' }, { status: 403 });
    }

    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      { role },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Role updated successfully', role }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
