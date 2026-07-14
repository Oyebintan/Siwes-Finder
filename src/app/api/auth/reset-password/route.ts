import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import { findUserByEmail } from '@/lib/userLookup';
import { RATE_LIMITS, rateLimitGuard } from '@/lib/rateLimit';

const MAX_ATTEMPTS = 5;

export async function POST(req: Request) {
  try {
    const { email, otp, newPassword } = await req.json();
    // typeof checks matter beyond validation: these values go into a
    // MongoDB query and bcrypt.compare -- an object like {"$gt":""} in
    // place of a string must never reach either.
    if (!email || !otp || !newPassword || typeof email !== 'string' || typeof otp !== 'string') {
      return NextResponse.json({ error: 'Missing fields.' }, { status: 400 });
    }
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    const limited = await rateLimitGuard(req, 'reset-password', RATE_LIMITS.otpVerify);
    if (limited) return limited;

    await connectToDatabase();
    const user = await findUserByEmail(email);

    if (!user || !user.resetOtpHash || !user.resetOtpExpires) {
      return NextResponse.json({ error: 'Invalid or expired code. Please request a new one.' }, { status: 400 });
    }

    if (user.resetOtpExpires < new Date()) {
      user.resetOtpHash = undefined;
      user.resetOtpExpires = undefined;
      user.resetOtpAttempts = 0;
      await user.save();
      return NextResponse.json({ error: 'This code has expired. Please request a new one.' }, { status: 400 });
    }

    if ((user.resetOtpAttempts ?? 0) >= MAX_ATTEMPTS) {
      return NextResponse.json({ error: 'Too many incorrect attempts. Please request a new code.' }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(otp, user.resetOtpHash);
    if (!isMatch) {
      user.resetOtpAttempts = (user.resetOtpAttempts ?? 0) + 1;
      await user.save();
      return NextResponse.json({ error: 'Incorrect code.' }, { status: 400 });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetOtpHash = undefined;
    user.resetOtpExpires = undefined;
    user.resetOtpAttempts = 0;
    await user.save();

    return NextResponse.json({ message: 'Password reset successfully.' }, { status: 200 });
  } catch (error) {
    console.error('Reset-password error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
