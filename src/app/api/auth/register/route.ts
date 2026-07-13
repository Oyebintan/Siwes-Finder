import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { sendEmailVerificationOtpEmail } from '@/lib/email';

const OTP_TTL_MS = 10 * 60 * 1000;

export async function POST(req: Request) {
  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Public signup can only create student/employer/school accounts. Admin
    // and super_admin are granted exclusively via the ADMIN_EMAILS /
    // SUPER_ADMIN_EMAILS allowlists at sign-in — never from a request body.
    if (!['student', 'employer', 'school'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    await connectToDatabase();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Every new account gets an email-verification code up front, same
    // OTP-hash pattern as password reset -- the account is usable
    // immediately (see auto-login-after-register on both web and mobile),
    // but applying to placements / posting opportunities is gated on
    // emailVerified until this code is confirmed via /verify-email.
    const otp = crypto.randomInt(100000, 1000000).toString();
    const verifyOtpHash = await bcrypt.hash(otp, 10);

    await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      verifyOtpHash,
      verifyOtpExpires: new Date(Date.now() + OTP_TTL_MS),
      verifyOtpAttempts: 0,
      // Schools see student records (logbooks, applications), so they queue
      // for admin verification immediately instead of the default
      // 'unsubmitted' — an unapproved school account can sign in but its
      // student-data endpoints stay locked until an admin approves it.
      ...(role === 'school' ? { verificationStatus: 'pending' } : {}),
    });

    try {
      await sendEmailVerificationOtpEmail(email, otp);
    } catch (emailError) {
      // Best-effort: the account is already created and usable, and the
      // resend-verification endpoint gives the user a retry path -- a
      // flaky email provider shouldn't block account creation itself.
      console.error('Failed to send verification email:', emailError);
    }

    return NextResponse.json({ message: 'User created successfully' }, { status: 201 });
  } catch (error) {
    // Duplicate key from the unique email index — a race with the existence
    // check above. Same outcome as the pre-check: the email is taken.
    if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    console.error("Registration error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Server error' }, { status: 500 });
  }
}
