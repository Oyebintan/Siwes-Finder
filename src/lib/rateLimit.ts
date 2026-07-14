import mongoose from 'mongoose';
import { NextResponse } from 'next/server';
import { connectToDatabase } from './mongodb';

// Fixed-window rate limiter backed by MongoDB, so limits hold across
// Vercel's independent serverless instances without adding Redis or any
// other infrastructure. Atomicity comes from a single findOneAndUpdate
// upsert per request; expired windows are garbage-collected by a TTL
// index rather than application code.
//
// Deliberately FAIL-OPEN: if the store is unreachable the request is
// allowed. Rate limiting is an abuse dampener, not an auth check — a
// database outage must never lock every user out of login/signup (and
// when Mongo is down, the guarded routes are about to fail on their own
// queries anyway).

export type RateLimitOptions = {
  // Something stable about the caller: an IP, an email, or both.
  key: string;
  // Route/purpose namespace so 'login' and 'forgot-password' never share
  // a bucket for the same IP.
  name: string;
  windowMs: number;
  max: number;
};

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

const COLLECTION = 'rate_limits';

// createIndex is idempotent server-side, but avoid re-issuing it on every
// request from the same warm instance.
let indexEnsured: Promise<unknown> | null = null;

export async function checkRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  try {
    await connectToDatabase();
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      return { ok: true };
    }

    const col = mongoose.connection.db.collection(COLLECTION);
    if (!indexEnsured) {
      indexEnsured = col
        .createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })
        .catch(() => {
          indexEnsured = null; // retry on a later request
        });
    }

    const windowStart = Math.floor(Date.now() / opts.windowMs) * opts.windowMs;
    const doc = await col.findOneAndUpdate(
      { name: opts.name, key: opts.key, windowStart },
      {
        $inc: { count: 1 },
        // Kept a full extra window past expiry so a request racing the TTL
        // monitor (which only sweeps every ~60s) still finds its document.
        $setOnInsert: { expiresAt: new Date(windowStart + opts.windowMs * 2) },
      },
      { upsert: true, returnDocument: 'after' }
    );

    const count = (doc?.count as number | undefined) ?? 1;
    if (count > opts.max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((windowStart + opts.windowMs - Date.now()) / 1000));
      return { ok: false, retryAfterSeconds };
    }
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

// First hop of x-forwarded-for -- on Vercel that's the real client IP (the
// platform sets the header itself; a client-supplied value is overwritten).
export function clientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip') ?? 'unknown';
}

// Convenience wrapper for API routes: returns a ready-to-send 429 response
// when the caller is over the limit, or null to proceed. The message stays
// generic on purpose -- no hint about which bucket (IP vs email) tripped.
export async function rateLimitGuard(
  req: Request,
  name: string,
  limit: { windowMs: number; max: number },
  extraKey?: string
): Promise<NextResponse | null> {
  const key = extraKey ? `${clientIp(req)}:${extraKey}` : clientIp(req);
  const result = await checkRateLimit({ name, key, windowMs: limit.windowMs, max: limit.max });
  if (result.ok) return null;
  return NextResponse.json(
    { error: 'Too many requests. Please wait a moment and try again.' },
    { status: 429, headers: { 'Retry-After': String(result.retryAfterSeconds) } }
  );
}

const MINUTE = 60 * 1000;

// Central per-route budgets. Windows are deliberately generous because many
// Nigerian students share campus NATs -- one hostel IP must not lock out a
// whole class. Per-account OTP attempt caps (5 tries per code) remain the
// primary brute-force defense; these buckets bound volume and email spam.
export const RATE_LIMITS = {
  login: { windowMs: 15 * MINUTE, max: 30 },
  register: { windowMs: 60 * MINUTE, max: 20 },
  // Sends an email per hit -- tightest budget, keyed by IP+email at the
  // call site so one target inbox can't be flooded from one machine...
  sendOtpEmail: { windowMs: 15 * MINUTE, max: 5 },
  // ...plus a wider per-IP budget so rotating through many victim emails
  // from one machine doesn't dodge the per-inbox cap.
  sendOtpEmailPerIp: { windowMs: 15 * MINUTE, max: 20 },
  otpVerify: { windowMs: 15 * MINUTE, max: 30 },
} as const;
