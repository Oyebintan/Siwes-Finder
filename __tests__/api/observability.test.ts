// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/rateLimit', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/rateLimit')>();
  return { ...original, rateLimitGuard: vi.fn().mockResolvedValue(null) };
});

import { POST as clientErrors } from '@/app/api/client-errors/route';
import { POST as cspReport } from '@/app/api/csp-report/route';
import { rateLimitGuard } from '@/lib/rateLimit';
import { NextResponse } from 'next/server';

describe('observability endpoints', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    (rateLimitGuard as any).mockResolvedValue(null);
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('logs a client error report and returns 204', async () => {
    const res = await clientErrors(
      new Request('http://localhost/api/client-errors', {
        method: 'POST',
        body: JSON.stringify({ message: 'boom', stack: 'at x', url: 'http://localhost/student/jobs' }),
      })
    );
    expect(res.status).toBe(204);
    const logged = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(logged.source).toBe('client-error');
    expect(logged.message).toBe('boom');
  });

  it('caps oversized client-error fields instead of logging them verbatim', async () => {
    const res = await clientErrors(
      new Request('http://localhost/api/client-errors', {
        method: 'POST',
        body: JSON.stringify({ message: 'x'.repeat(50_000) }),
      })
    );
    expect(res.status).toBe(204);
    const logged = JSON.parse(errorSpy.mock.calls[0][0] as string);
    expect(logged.message.length).toBeLessThanOrEqual(4000);
  });

  it('still 204s on a malformed client-error body', async () => {
    const res = await clientErrors(
      new Request('http://localhost/api/client-errors', { method: 'POST', body: 'not-json' })
    );
    expect(res.status).toBe(204);
  });

  it('returns the 429 from the rate limiter when over budget', async () => {
    (rateLimitGuard as any).mockResolvedValue(
      NextResponse.json({ error: 'Too many requests.' }, { status: 429 })
    );
    const res = await clientErrors(
      new Request('http://localhost/api/client-errors', { method: 'POST', body: '{}' })
    );
    expect(res.status).toBe(429);
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('logs a CSP violation report and returns 204', async () => {
    const res = await cspReport(
      new Request('http://localhost/api/csp-report', {
        method: 'POST',
        body: JSON.stringify({ 'csp-report': { 'violated-directive': 'img-src' } }),
      })
    );
    expect(res.status).toBe(204);
    const logged = JSON.parse(warnSpy.mock.calls[0][0] as string);
    expect(logged.source).toBe('csp-report');
    expect(logged.report).toContain('img-src');
  });
});
