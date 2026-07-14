import { NextResponse } from 'next/server';
import { rateLimitGuard } from '@/lib/rateLimit';

// Browser-side crash reports (see src/app/error.tsx). Server errors are
// captured by src/instrumentation.ts, but a client-only render crash
// never reaches the server on its own -- this endpoint is how those
// become visible in the Vercel Logs dashboard. Deliberately unauthenticated
// (crashes on public pages matter too), so inputs are length-capped and
// rate-limited: it must not become a log-flooding vector.
const MAX_FIELD = 4000;

function clip(value: unknown): string | undefined {
  return typeof value === 'string' ? value.slice(0, MAX_FIELD) : undefined;
}

export async function POST(req: Request) {
  const limited = await rateLimitGuard(req, 'client-errors', { windowMs: 60_000, max: 10 });
  if (limited) return limited;

  try {
    const body = await req.json();
    console.error(
      JSON.stringify({
        source: 'client-error',
        message: clip(body.message) ?? 'unknown',
        stack: clip(body.stack),
        digest: clip(body.digest),
        url: clip(body.url),
        userAgent: req.headers.get('user-agent')?.slice(0, 300),
      })
    );
  } catch {
    // A malformed report is not worth a 4xx round-trip -- drop it.
  }
  return new NextResponse(null, { status: 204 });
}
