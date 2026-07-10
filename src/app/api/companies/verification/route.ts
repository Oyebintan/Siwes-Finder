import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

// Shared by employers (company/CAC verification) and schools (institution/
// accreditation verification) -- same fields, different labels in each
// role's UI. Both go through the same admin queue (/api/admin/companies).
const ELIGIBLE_ROLES = ['employer', 'school'];

// GET: the current employer/school's verification state (for the dashboard banner).
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ELIGIBLE_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(session.user.id).select(
      'companyName industry companyDescription cacNumber officialEmail avatarUrl verificationDocumentUrl verificationStatus verificationRejectionReason verificationReviewedAt'
    );
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ verification: user }, { status: 200 });
  } catch (error) {
    console.error('Verification GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST: employer submits company details + CAC document, or a school submits
// institution details + accreditation document, for admin review.
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !ELIGIBLE_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const companyName = (body.companyName || '').trim();
    const cacNumber = (body.cacNumber || '').trim();
    const officialEmail = (body.officialEmail || '').trim();
    const verificationDocumentUrl = (body.verificationDocumentUrl || '').trim();
    const industry = (body.industry || '').trim();
    const companyDescription = (body.companyDescription || '').trim();

    if (!companyName || !cacNumber || !officialEmail || !verificationDocumentUrl) {
      return NextResponse.json(
        { error: 'Name, registration/accreditation number, official email and verification document are all required.' },
        { status: 400 }
      );
    }

    // Basic email shape check for the official email.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(officialEmail)) {
      return NextResponse.json({ error: 'Please provide a valid official email address.' }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Cannot re-submit while already approved.
    if (user.verificationStatus === 'approved') {
      return NextResponse.json({ error: 'You are already verified.' }, { status: 400 });
    }

    user.companyName = companyName;
    user.industry = industry;
    user.companyDescription = companyDescription;
    user.cacNumber = cacNumber;
    user.officialEmail = officialEmail;
    user.verificationDocumentUrl = verificationDocumentUrl;
    user.verificationStatus = 'pending';
    user.verificationRejectionReason = undefined;
    user.verificationReviewedAt = undefined;
    await user.save();

    return NextResponse.json(
      { message: 'Verification submitted. An admin will review it shortly.', status: 'pending' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verification POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
