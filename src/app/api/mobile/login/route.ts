import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { issueMobileToken } from '@/lib/mobileAuth';
import { isEmailVerificationRequired } from '@/lib/emailVerification';

// POST: credentials login for the Expo app. Mirrors the web's
// CredentialsProvider.authorize() (src/lib/auth.ts) -- same bcrypt check,
// same "don't reveal which of email/password was wrong" behavior -- but
// returns a bearer token instead of setting a cookie, since a native app
// has no cookie jar shared with the browser.
//
// Google sign-in on mobile is a later phase (needs expo-auth-session); this
// route is credentials-only for now.
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    await connectToDatabase();

    const user = await User.findOne({ email });
    if (!user || !user.password) {
      return NextResponse.json({ error: 'No account found with this email.' }, { status: 401 });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
    }

    const sessionUser = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
      // With verification switched off (see lib/emailVerification.ts),
      // report every account as verified so pre-existing unverified
      // accounts aren't routed to a verify screen that can't get codes.
      emailVerified: user.emailVerified || !isEmailVerificationRequired(),
    };
    const token = await issueMobileToken(sessionUser);

    return NextResponse.json({ token, user: sessionUser }, { status: 200 });
  } catch (error) {
    console.error('Mobile login error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
