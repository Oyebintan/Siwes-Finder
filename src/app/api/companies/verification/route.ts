import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';

// GET: the current employer's verification state (for the dashboard banner).
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'employer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(session.user.id).select(
      'companyName industry companyDescription cacNumber officialEmail verificationDocumentUrl verificationStatus verificationRejectionReason verificationReviewedAt'
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

// POST: employer submits company details + CAC document for admin review.
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'employer') {
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
        { error: 'Company name, CAC number, official email and verification document are all required.' },
        { status: 400 }
      );
    }

    // Basic email shape check for the official company email.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(officialEmail)) {
      return NextResponse.json({ error: 'Please provide a valid official company email.' }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Cannot re-submit while already approved.
    if (user.verificationStatus === 'approved') {
      return NextResponse.json({ error: 'Your company is already verified.' }, { status: 400 });
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
      { message: 'Verification submitted. An admin will review your company shortly.', status: 'pending' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verification POST error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
