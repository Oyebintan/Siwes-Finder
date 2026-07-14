// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fakeConnection, fakeCol } = vi.hoisted(() => {
  const fakeCol = {
    createIndex: vi.fn().mockResolvedValue('ok'),
    findOneAndUpdate: vi.fn(),
  };
  const fakeConnection = {
    readyState: 1,
    db: { collection: () => fakeCol },
  };
  return { fakeConnection, fakeCol };
});

vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('mongoose', () => ({ default: { connection: fakeConnection } }));

import { checkRateLimit, clientIp, rateLimitGuard } from '@/lib/rateLimit';

function makeRequest(headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/test', { headers });
}

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeConnection.readyState = 1;
  });

  it('allows a request under the limit', async () => {
    fakeCol.findOneAndUpdate.mockResolvedValue({ count: 3 });
    const result = await checkRateLimit({ name: 'login', key: '1.2.3.4', windowMs: 60_000, max: 5 });
    expect(result).toEqual({ ok: true });
  });

  it('blocks a request over the limit and reports a sane retry delay', async () => {
    fakeCol.findOneAndUpdate.mockResolvedValue({ count: 6 });
    const result = await checkRateLimit({ name: 'login', key: '1.2.3.4', windowMs: 60_000, max: 5 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.retryAfterSeconds).toBeGreaterThanOrEqual(1);
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
    }
  });

  it('scopes buckets by name and key in the query', async () => {
    fakeCol.findOneAndUpdate.mockResolvedValue({ count: 1 });
    await checkRateLimit({ name: 'register', key: '5.6.7.8', windowMs: 60_000, max: 5 });
    const [filter] = fakeCol.findOneAndUpdate.mock.calls[0];
    expect(filter.name).toBe('register');
    expect(filter.key).toBe('5.6.7.8');
    expect(typeof filter.windowStart).toBe('number');
  });

  it('fails open when the store errors', async () => {
    fakeCol.findOneAndUpdate.mockRejectedValue(new Error('mongo down'));
    const result = await checkRateLimit({ name: 'login', key: '1.2.3.4', windowMs: 60_000, max: 5 });
    expect(result).toEqual({ ok: true });
  });

  it('fails open when the connection is not ready', async () => {
    fakeConnection.readyState = 0;
    const result = await checkRateLimit({ name: 'login', key: '1.2.3.4', windowMs: 60_000, max: 5 });
    expect(result).toEqual({ ok: true });
    expect(fakeCol.findOneAndUpdate).not.toHaveBeenCalled();
  });
});

describe('clientIp', () => {
  it('takes the first hop of x-forwarded-for', () => {
    expect(clientIp(makeRequest({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1' }))).toBe('203.0.113.7');
  });

  it('falls back to x-real-ip, then "unknown"', () => {
    expect(clientIp(makeRequest({ 'x-real-ip': '198.51.100.2' }))).toBe('198.51.100.2');
    expect(clientIp(makeRequest())).toBe('unknown');
  });
});

describe('rateLimitGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fakeConnection.readyState = 1;
  });

  it('returns null when under the limit', async () => {
    fakeCol.findOneAndUpdate.mockResolvedValue({ count: 1 });
    const res = await rateLimitGuard(makeRequest(), 'login', { windowMs: 60_000, max: 5 });
    expect(res).toBeNull();
  });

  it('returns a 429 with Retry-After when over the limit', async () => {
    fakeCol.findOneAndUpdate.mockResolvedValue({ count: 99 });
    const res = await rateLimitGuard(makeRequest(), 'login', { windowMs: 60_000, max: 5 });
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
    expect(Number(res!.headers.get('Retry-After'))).toBeGreaterThanOrEqual(1);
    const data = await res!.json();
    expect(data.error).toMatch(/too many requests/i);
  });
});
