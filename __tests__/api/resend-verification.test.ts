// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/User', () => ({ default: { findOne: vi.fn() } }));
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn() } }));
vi.mock('@/lib/email', () => ({ sendEmailVerificationOtpEmail: vi.fn() }));

import { POST } from '@/app/api/auth/resend-verification/route';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { sendEmailVerificationOtpEmail } from '@/lib/email';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/auth/resend-verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/resend-verification', () => {
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
    expect(data.message).toMatch(/if an unverified account exists/i);
    expect(sendEmailVerificationOtpEmail).not.toHaveBeenCalled();
  });

  it('returns the same generic message without sending an email when already verified', async () => {
    (User.findOne as any).mockResolvedValue({ _id: 'u1', email: 'ada@example.com', emailVerified: true, save: vi.fn() });

    const res = await POST(makeRequest({ email: 'ada@example.com' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toMatch(/if an unverified account exists/i);
    expect(sendEmailVerificationOtpEmail).not.toHaveBeenCalled();
  });

  it('generates and emails a fresh OTP for an unverified account', async () => {
    const user: any = { _id: 'u1', email: 'ada@example.com', emailVerified: false, save: vi.fn().mockResolvedValue(undefined) };
    (User.findOne as any).mockResolvedValue(user);
    (bcrypt.hash as any).mockResolvedValue('hashed-otp');
    (sendEmailVerificationOtpEmail as any).mockResolvedValue(undefined);

    const res = await POST(makeRequest({ email: 'ada@example.com' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toMatch(/if an unverified account exists/i);
    expect(user.verifyOtpHash).toBe('hashed-otp');
    expect(user.verifyOtpExpires).toBeInstanceOf(Date);
    expect(user.verifyOtpAttempts).toBe(0);
    expect(user.save).toHaveBeenCalled();

    const [emailedTo, emailedOtp] = (sendEmailVerificationOtpEmail as any).mock.calls[0];
    expect(emailedTo).toBe('ada@example.com');
    expect(emailedOtp).toMatch(/^\d{6}$/);
  });

  it('returns 502 when the email fails to send', async () => {
    const user: any = { _id: 'u1', email: 'ada@example.com', emailVerified: false, save: vi.fn().mockResolvedValue(undefined) };
    (User.findOne as any).mockResolvedValue(user);
    (bcrypt.hash as any).mockResolvedValue('hashed-otp');
    (sendEmailVerificationOtpEmail as any).mockRejectedValue(new Error('Resend is down'));

    const res = await POST(makeRequest({ email: 'ada@example.com' }));
    const data = await res.json();

    expect(res.status).toBe(502);
    expect(data.error).toMatch(/could not send/i);
  });
});
