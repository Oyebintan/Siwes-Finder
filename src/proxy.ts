import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Next.js 16 renamed `middleware` to `proxy`. This is a first-line, optimistic
// role gate for the dashboard route groups — the authoritative authorization
// checks still live in each API route handler.
const ROLE_HOME: Record<string, string> = {
  admin: '/admin/dashboard',
  employer: '/employer/dashboard',
  student: '/student/dashboard',
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });

  // Not signed in → send to login, remembering where they were headed.
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = (token.role as string) || 'unassigned';

  const requiredRole = pathname.startsWith('/admin')
    ? 'admin'
    : pathname.startsWith('/employer')
      ? 'employer'
      : pathname.startsWith('/student')
        ? 'student'
        : null;

  // Wrong role for this area → bounce to the user's own home (or onboarding if
  // they haven't picked a role yet).
  if (requiredRole && role !== requiredRole) {
    const home = ROLE_HOME[role] ?? '/onboarding';
    return NextResponse.redirect(new URL(home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/employer/:path*', '/student/:path*'],
};
