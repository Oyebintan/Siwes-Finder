// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/User', () => ({ default: { findOne: vi.fn() } }));
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn() } }));
vi.mock('@/lib/email', () => ({ sendPasswordResetOtpEmail: vi.fn() }));

import { POST } from '@/app/api/auth/forgot-password/route';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { sendPasswordResetOtpEmail } from '@/lib/email';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a request missing an email', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns the generic message without sending an email when no account exists', async () => {
    (User.findOne as any).mockResolvedValue(null);

    const res = await POST(makeRequest({ email: 'nobody@example.com' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toMatch(/if an account exists/i);
    expect(sendPasswordResetOtpEmail).not.toHaveBeenCalled();
  });

  it('returns the same generic message without sending an email for a Google-only account (no password)', async () => {
    (User.findOne as any).mockResolvedValue({ _id: 'u1', email: 'google@example.com', password: undefined, save: vi.fn() });

    const res = await POST(makeRequest({ email: 'google@example.com' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toMatch(/if an account exists/i);
    expect(sendPasswordResetOtpEmail).not.toHaveBeenCalled();
  });

  it('generates and emails an OTP for an existing password account', async () => {
    const user: any = { _id: 'u1', email: 'ada@example.com', password: 'hashed-pw', save: vi.fn().mockResolvedValue(undefined) };
    (User.findOne as any).mockResolvedValue(user);
    (bcrypt.hash as any).mockResolvedValue('hashed-otp');
    (sendPasswordResetOtpEmail as any).mockResolvedValue(undefined);

    const res = await POST(makeRequest({ email: 'ada@example.com' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toMatch(/if an account exists/i);
    expect(user.resetOtpHash).toBe('hashed-otp');
    expect(user.resetOtpExpires).toBeInstanceOf(Date);
    expect(user.resetOtpAttempts).toBe(0);
    expect(user.save).toHaveBeenCalled();

    const [emailedTo, emailedOtp] = (sendPasswordResetOtpEmail as any).mock.calls[0];
    expect(emailedTo).toBe('ada@example.com');
    expect(emailedOtp).toMatch(/^\d{6}$/);
  });

  it('returns 502 when the email fails to send', async () => {
    const user: any = { _id: 'u1', email: 'ada@example.com', password: 'hashed-pw', save: vi.fn().mockResolvedValue(undefined) };
    (User.findOne as any).mockResolvedValue(user);
    (bcrypt.hash as any).mockResolvedValue('hashed-otp');
    (sendPasswordResetOtpEmail as any).mockRejectedValue(new Error('Resend is down'));

    const res = await POST(makeRequest({ email: 'ada@example.com' }));
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error).toMatch(/could not send/i);
  });
});
