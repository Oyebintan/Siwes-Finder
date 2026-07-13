// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/User', () => ({ default: { findOne: vi.fn() } }));
vi.mock('bcryptjs', () => ({ default: { compare: vi.fn() } }));

import { POST } from '@/app/api/auth/verify-email/route';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/auth/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'u1',
    email: 'ada@example.com',
    emailVerified: false,
    verifyOtpHash: 'hashed-otp',
    verifyOtpExpires: new Date(Date.now() + 5 * 60 * 1000),
    verifyOtpAttempts: 0,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as any;
}

describe('POST /api/auth/verify-email', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a request missing fields', async () => {
    const res = await POST(makeRequest({ email: 'ada@example.com' }));
    expect(res.status).toBe(400);
  });

  it('short-circuits with a friendly message when already verified', async () => {
    (User.findOne as any).mockResolvedValue(makeUser({ emailVerified: true }));

    const res = await POST(makeRequest({ email: 'ada@example.com', otp: '123456' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toMatch(/already verified/i);
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('rejects when there is no pending verification for the email', async () => {
    (User.findOne as any).mockResolvedValue(null);
    const res = await POST(makeRequest({ email: 'nobody@example.com', otp: '123456' }));
    expect(res.status).toBe(400);
  });

  it('rejects and clears state once the code has expired', async () => {
    const user = makeUser({ verifyOtpExpires: new Date(Date.now() - 1000) });
    (User.findOne as any).mockResolvedValue(user);

    const res = await POST(makeRequest({ email: 'ada@example.com', otp: '123456' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/expired/i);
    expect(user.verifyOtpHash).toBeUndefined();
    expect(user.save).toHaveBeenCalled();
  });

  it('rejects once the attempt limit has been reached', async () => {
    const user = makeUser({ verifyOtpAttempts: 5 });
    (User.findOne as any).mockResolvedValue(user);

    const res = await POST(makeRequest({ email: 'ada@example.com', otp: '123456' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/too many/i);
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('increments attempts and rejects an incorrect code', async () => {
    const user = makeUser();
    (User.findOne as any).mockResolvedValue(user);
    (bcrypt.compare as any).mockResolvedValue(false);

    const res = await POST(makeRequest({ email: 'ada@example.com', otp: '000000' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/incorrect code/i);
    expect(user.verifyOtpAttempts).toBe(1);
    expect(user.save).toHaveBeenCalled();
  });

  it('marks the email verified and clears OTP state on a correct code', async () => {
    const user = makeUser();
    (User.findOne as any).mockResolvedValue(user);
    (bcrypt.compare as any).mockResolvedValue(true);

    const res = await POST(makeRequest({ email: 'ada@example.com', otp: '123456' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toMatch(/verified successfully/i);
    expect(user.emailVerified).toBe(true);
    expect(user.verifyOtpHash).toBeUndefined();
    expect(user.verifyOtpExpires).toBeUndefined();
    expect(user.verifyOtpAttempts).toBe(0);
    expect(user.save).toHaveBeenCalled();
  });
});
