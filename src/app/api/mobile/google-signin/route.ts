import { NextResponse } from 'next/server';
import { OAuth2Client } from 'google-auth-library';
import { findOrCreateGoogleUser } from '@/lib/googleAuth';
import { issueMobileToken } from '@/lib/mobileAuth';
import { isEmailVerificationRequired } from '@/lib/emailVerification';
import { RATE_LIMITS, rateLimitGuard } from '@/lib/rateLimit';

const client = new OAuth2Client();

// Google issues the ID token with `aud` set to whichever OAuth client ID
// initiated the request on-device -- Android and iOS each need their own
// native client ID (see Google Cloud Console), and the existing web client
// ID doubles as the fallback for Expo Go / dev builds. Any of these is a
// valid audience for a token this route should accept. Read per-request
// (not cached at module scope) so it stays testable and picks up a config
// change without a redeploy, same as NEXTAUTH_SECRET in mobileAuth.ts.
function mobileGoogleClientIds(): string[] {
  return [process.env.GOOGLE_ANDROID_CLIENT_ID, process.env.GOOGLE_IOS_CLIENT_ID, process.env.GOOGLE_CLIENT_ID].filter(
    (id): id is string => !!id
  );
}

// POST: Google sign-in for the Expo app. The client runs the OAuth flow
// on-device (expo-auth-session) and exchanges it for a Google ID token
// itself -- this route only ever sees and verifies that ID token, never a
// client secret. Mirrors /api/mobile/login's response shape (bearer token
// + session user) so AuthContext can't tell a Google sign-in from a
// password one.
export async function POST(req: Request) {
  try {
    const audience = mobileGoogleClientIds();
    if (audience.length === 0) {
      return NextResponse.json({ error: 'Google sign-in is not configured.' }, { status: 503 });
    }

    const { idToken } = await req.json();
    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Missing Google ID token.' }, { status: 400 });
    }

    const limited = await rateLimitGuard(req, 'login', RATE_LIMITS.login);
    if (limited) return limited;

    let email: string | undefined;
    let name: string | undefined;
    try {
      const ticket = await client.verifyIdToken({ idToken, audience });
      const payload = ticket.getPayload();
      if (!payload?.email || !payload.email_verified) {
        return NextResponse.json({ error: 'Invalid Google sign-in.' }, { status: 401 });
      }
      email = payload.email;
      name = payload.name;
    } catch {
      return NextResponse.json({ error: 'Invalid Google sign-in.' }, { status: 401 });
    }

    const user = await findOrCreateGoogleUser({ email, name });

    const sessionUser = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
      // Mirrors /api/mobile/login: with verification switched off (see
      // lib/emailVerification.ts), report every account as verified.
      emailVerified: user.emailVerified || !isEmailVerificationRequired(),
    };
    const token = await issueMobileToken(sessionUser);

    return NextResponse.json({ token, user: sessionUser }, { status: 200 });
  } catch (error) {
    console.error('Mobile Google sign-in error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
