import { NextResponse } from 'next/server';
import { rateLimitGuard } from '@/lib/rateLimit';

// Receiver for Content-Security-Policy-Report-Only violations (see
// next.config.ts). While the policy runs in report-only mode nothing is
// ever blocked -- browsers just POST here whenever a directive WOULD have
// blocked something. Watching these logs for a while is how the policy
// gets tightened into enforce mode without breaking the site.
export async function POST(req: Request) {
  const limited = await rateLimitGuard(req, 'csp-report', { windowMs: 60_000, max: 20 });
  if (limited) return limited;

  try {
    const body = await req.text();
    console.warn(JSON.stringify({ source: 'csp-report', report: body.slice(0, 4000) }));
  } catch {
    // Drop malformed reports silently.
  }
  return new NextResponse(null, { status: 204 });
}
