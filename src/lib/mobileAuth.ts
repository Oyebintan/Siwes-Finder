import { getServerSession } from 'next-auth/next';
import { getToken, encode } from 'next-auth/jwt';
import { authOptions } from '@/lib/auth';

// Mirrors the web session's rolling 2-hour lifetime (see authOptions in
// src/lib/auth.ts) so a mobile user isn't logged out sooner or later than
// someone on the website doing the same thing.
const MOBILE_TOKEN_MAX_AGE = 60 * 60 * 2;

export type SessionUser = {
  id: string;
  role: string;
  email?: string | null;
  name?: string | null;
};

// Issues a NextAuth-compatible encrypted JWT for the mobile app to send back
// as `Authorization: Bearer <token>`. Signed with the same NEXTAUTH_SECRET
// and the same (default, saltless) encoding NextAuth's own cookie sessions
// use, so next-auth/jwt's getToken() decodes it identically either way --
// no separate mobile-only auth system, no new secret.
export async function issueMobileToken(user: SessionUser): Promise<string> {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is not set.');
  }

  return encode({ token: user, secret, maxAge: MOBILE_TOKEN_MAX_AGE });
}

// Resolves the caller from either a NextAuth cookie session (web) or an
// `Authorization: Bearer <token>` header (mobile) -- same signed token
// either way. This is the single place an existing API route changes to
// serve both clients: swap `getServerSession(authOptions)` (no req) for
// `requireSession(req)`. Cookie sessions keep working exactly as before
// (getServerSession reads the App Router's request context on its own);
// the bearer path only kicks in when there's no cookie session, using the
// route's own `req` to read the Authorization header.
export async function requireSession(req: Request): Promise<{ user: SessionUser } | null> {
  const cookieSession = await getServerSession(authOptions);
  if (cookieSession?.user) {
    return { user: cookieSession.user as SessionUser };
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) return null;

  const token = await getToken({ req: req as Parameters<typeof getToken>[0]['req'], secret });
  if (!token?.id) return null;

  return {
    user: {
      id: token.id as string,
      role: token.role as string,
      email: (token.email as string | undefined) ?? null,
      name: (token.name as string | undefined) ?? null,
    },
  };
}
