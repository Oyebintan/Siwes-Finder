import { NextResponse } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import { sendPasswordResetOtpEmail } from '@/lib/email';

const OTP_TTL_MS = 10 * 60 * 1000;

const GENERIC_MESSAGE = 'If an account exists for that email, a reset code has been sent.';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    await connectToDatabase();
    const user = await User.findOne({ email });

    // Password-only accounts: Google-only users have no password to reset.
    // Always return the same generic response either way so this endpoint
    // can't be used to enumerate registered emails.
    if (user && user.password) {
      const otp = crypto.randomInt(100000, 1000000).toString();
      user.resetOtpHash = await bcrypt.hash(otp, 10);
      user.resetOtpExpires = new Date(Date.now() + OTP_TTL_MS);
      user.resetOtpAttempts = 0;
      await user.save();

      try {
        await sendPasswordResetOtpEmail(user.email, otp);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        return NextResponse.json({ error: 'Could not send the reset code. Please try again shortly.' }, { status: 502 });
      }
    }

    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  } catch (error) {
    console.error('Forgot-password error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
