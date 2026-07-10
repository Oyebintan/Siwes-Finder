import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { isAdminRole } from '@/lib/roles';

// GET: list employer/company accounts for the verification queue.
// ?status=pending|approved|rejected|unsubmitted|all  (default: pending)
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const status = (searchParams.get('status') || 'pending').trim();

    // Schools go through the same admin verification queue as employers —
    // they see student records, so they also need manual approval.
    const filter: Record<string, unknown> = { role: { $in: ['employer', 'school'] } };
    if (status !== 'all') {
      filter.verificationStatus = status;
    }

    const companies = await User.find(filter)
      .select(
        'name email role companyName industry companyDescription cacNumber officialEmail verificationDocumentUrl verificationStatus verificationRejectionReason verificationReviewedAt createdAt'
      )
      .sort({ createdAt: -1 });

    return NextResponse.json({ companies }, { status: 200 });
  } catch (error) {
    console.error('Admin companies GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
