import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import { sendEmailVerificationOtpEmail } from '@/lib/email';
import { findUserByEmail, normalizeEmail } from '@/lib/userLookup';
import { RATE_LIMITS, rateLimitGuard } from '@/lib/rateLimit';

const OTP_TTL_MS = 10 * 60 * 1000;

const GENERIC_MESSAGE = 'If an unverified account exists for that email, a verification code has been sent.';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    // Same double budget as forgot-password: per target inbox, per caller IP.
    const limited =
      (await rateLimitGuard(req, 'resend-verification', RATE_LIMITS.sendOtpEmail, normalizeEmail(email))) ??
      (await rateLimitGuard(req, 'resend-verification-ip', RATE_LIMITS.sendOtpEmailPerIp));
    if (limited) return limited;

    await connectToDatabase();
    const user = await findUserByEmail(email);

    // Same generic response whether the account doesn't exist or is already
    // verified, so this endpoint can't be used to enumerate registered
    // emails or confirm verification status.
    if (user && !user.emailVerified) {
      const otp = crypto.randomInt(100000, 1000000).toString();
      user.verifyOtpHash = await bcrypt.hash(otp, 10);
      user.verifyOtpExpires = new Date(Date.now() + OTP_TTL_MS);
      user.verifyOtpAttempts = 0;
      await user.save();

      try {
        await sendEmailVerificationOtpEmail(user.email, otp);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        return NextResponse.json({ error: 'Could not send the verification code. Please try again shortly.' }, { status: 502 });
      }
    }

    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  } catch (error) {
    console.error('Resend-verification error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
