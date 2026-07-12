import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { isAdminRole } from '@/lib/roles';
import { sendVerificationDecisionEmail } from '@/lib/email';

// PATCH: approve or reject a company's verification.
// Body: { action: 'approve' | 'reject', reason?: string }
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !isAdminRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, reason } = await req.json();
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await connectToDatabase();
    const { id } = await params;

    const company = await User.findOne({ _id: id, role: { $in: ['employer', 'school'] } });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    if (action === 'approve') {
      company.verificationStatus = 'approved';
      company.verificationRejectionReason = undefined;
    } else {
      company.verificationStatus = 'rejected';
      company.verificationRejectionReason = (reason || '').trim() || 'No reason provided.';
    }
    company.verificationReviewedAt = new Date();
    await company.save();

    // Best-effort email -- a delivery failure must never fail the decision
    // itself (same convention as the application/logbook notifications).
    try {
      await sendVerificationDecisionEmail(
        company.email,
        company.companyName || company.name || 'there',
        company.role === 'school' ? 'school' : 'employer',
        company.verificationStatus as 'approved' | 'rejected',
        company.verificationRejectionReason
      );
    } catch (emailError) {
      console.error('Failed to send verification decision email:', emailError);
    }

    return NextResponse.json(
      { message: `Company ${action}d`, verificationStatus: company.verificationStatus },
      { status: 200 }
    );
  } catch (error) {
    console.error('Admin company PATCH error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
