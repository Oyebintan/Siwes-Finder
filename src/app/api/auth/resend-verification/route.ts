import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { sendEmailVerificationOtpEmail } from '@/lib/email';

const OTP_TTL_MS = 10 * 60 * 1000;

const GENERIC_MESSAGE = 'If an unverified account exists for that email, a verification code has been sent.';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email });

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
