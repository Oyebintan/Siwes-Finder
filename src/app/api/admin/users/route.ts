import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { isAdminRole } from '@/lib/roles';

// GET: paginated user list for admin user management.
// ?role=student|employer|admin|super_admin|unassigned  &  ?page=  &  ?limit=
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const role = (searchParams.get('role') || '').trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10) || 25));

    const filter: Record<string, unknown> = {};
    if (['student', 'employer', 'admin', 'super_admin', 'unassigned'].includes(role)) {
      filter.role = role;
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('name email role companyName university verificationStatus createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return NextResponse.json(
      { users, total, page, totalPages: Math.max(1, Math.ceil(total / limit)) },
      { status: 200 }
    );
  } catch (error) {
    console.error('Admin users GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
