import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import { findUserByEmail } from '@/lib/userLookup';
import { issueMobileToken } from '@/lib/mobileAuth';
import { isEmailVerificationRequired } from '@/lib/emailVerification';
import { RATE_LIMITS, rateLimitGuard } from '@/lib/rateLimit';

// POST: credentials login for the Expo app. Mirrors the web's
// CredentialsProvider.authorize() (src/lib/auth.ts) -- same bcrypt check,
// same "don't reveal which of email/password was wrong" behavior -- but
// returns a bearer token instead of setting a cookie, since a native app
// has no cookie jar shared with the browser.
//
// Google sign-in is a separate route: see /api/mobile/google-signin.
export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const limited = await rateLimitGuard(req, 'login', RATE_LIMITS.login);
    if (limited) return limited;

    await connectToDatabase();

    const user = await findUserByEmail(email);
    // One message for both failures: distinct "no account" / "wrong
    // password" responses let anyone probe which emails are registered.
    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
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
