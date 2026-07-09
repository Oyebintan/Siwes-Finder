// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/User', () => ({ default: { findOne: vi.fn() } }));
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn(), compare: vi.fn() } }));

import { POST } from '@/app/api/auth/reset-password/route';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    _id: 'u1',
    email: 'ada@example.com',
    resetOtpHash: 'hashed-otp',
    resetOtpExpires: new Date(Date.now() + 5 * 60 * 1000),
    resetOtpAttempts: 0,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as any;
}

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a request missing fields', async () => {
    const res = await POST(makeRequest({ email: 'ada@example.com' }));
    expect(res.status).toBe(400);
  });

  it('rejects a password shorter than 8 characters', async () => {
    const res = await POST(makeRequest({ email: 'ada@example.com', otp: '123456', newPassword: 'short' }));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error).toMatch(/8 characters/i);
  });

  it('rejects when there is no pending reset request for the email', async () => {
    (User.findOne as any).mockResolvedValue(null);
    const res = await POST(makeRequest({ email: 'nobody@example.com', otp: '123456', newPassword: 'longenough1' }));
    expect(res.status).toBe(400);
  });

  it('rejects and clears state once the code has expired', async () => {
    const user = makeUser({ resetOtpExpires: new Date(Date.now() - 1000) });
    (User.findOne as any).mockResolvedValue(user);

    const res = await POST(makeRequest({ email: 'ada@example.com', otp: '123456', newPassword: 'longenough1' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/expired/i);
    expect(user.resetOtpHash).toBeUndefined();
    expect(user.save).toHaveBeenCalled();
  });

  it('rejects once the attempt limit has been reached', async () => {
    const user = makeUser({ resetOtpAttempts: 5 });
    (User.findOne as any).mockResolvedValue(user);

    const res = await POST(makeRequest({ email: 'ada@example.com', otp: '123456', newPassword: 'longenough1' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/too many/i);
    expect(bcrypt.compare).not.toHaveBeenCalled();
  });

  it('increments attempts and rejects an incorrect code', async () => {
    const user = makeUser();
    (User.findOne as any).mockResolvedValue(user);
    (bcrypt.compare as any).mockResolvedValue(false);

    const res = await POST(makeRequest({ email: 'ada@example.com', otp: '000000', newPassword: 'longenough1' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/incorrect code/i);
    expect(user.resetOtpAttempts).toBe(1);
    expect(user.save).toHaveBeenCalled();
  });

  it('resets the password and clears the OTP state on a correct code', async () => {
    const user = makeUser();
    (User.findOne as any).mockResolvedValue(user);
    (bcrypt.compare as any).mockResolvedValue(true);
    (bcrypt.hash as any).mockResolvedValue('new-hashed-password');

    const res = await POST(makeRequest({ email: 'ada@example.com', otp: '123456', newPassword: 'longenough1' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toMatch(/reset successfully/i);
    expect(user.password).toBe('new-hashed-password');
    expect(user.resetOtpHash).toBeUndefined();
    expect(user.resetOtpExpires).toBeUndefined();
    expect(user.resetOtpAttempts).toBe(0);
    expect(user.save).toHaveBeenCalled();
  });
});
