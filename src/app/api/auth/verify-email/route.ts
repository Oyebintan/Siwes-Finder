import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import { findUserByEmail } from '@/lib/userLookup';
import { RATE_LIMITS, rateLimitGuard } from '@/lib/rateLimit';

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();
    // typeof checks matter beyond validation: these values go into a
    // MongoDB query and bcrypt.compare -- an object like {"$gt":""} in
    // place of a string must never reach either.
    if (!email || !otp || typeof email !== 'string' || typeof otp !== 'string') {
      return NextResponse.json({ error: 'Missing fields.' }, { status: 400 });
    }

    const limited = await rateLimitGuard(req, 'verify-email', RATE_LIMITS.otpVerify);
    if (limited) return limited;

    await connectToDatabase();
    const user = await findUserByEmail(email);

    if (user?.emailVerified) {
      return NextResponse.json({ message: 'Email already verified.' }, { status: 200 });
    }

    if (!user || !user.verifyOtpHash || !user.verifyOtpExpires) {
      return NextResponse.json({ error: 'Invalid or expired code. Please request a new one.' }, { status: 400 });
    }

    if (user.verifyOtpExpires < new Date()) {
      user.verifyOtpHash = undefined;
      user.verifyOtpExpires = undefined;
      user.verifyOtpAttempts = 0;
      await user.save();
      return NextResponse.json({ error: 'This code has expired. Please request a new one.' }, { status: 400 });
    }

    if ((user.verifyOtpAttempts ?? 0) >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: 'Too many incorrect attempts. Please request a new code.' }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(otp, user.verifyOtpHash);
    if (!isMatch) {
      user.verifyOtpAttempts = (user.verifyOtpAttempts ?? 0) + 1;
      await user.save();
      return NextResponse.json({ error: 'Incorrect code.' }, { status: 400 });
    }

    user.emailVerified = true;
    user.verifyOtpHash = undefined;
    user.verifyOtpExpires = undefined;
    user.verifyOtpAttempts = 0;
    await user.save();

    return NextResponse.json({ message: 'Email verified successfully.' }, { status: 200 });
  } catch (error) {
    console.error('Verify-email error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
