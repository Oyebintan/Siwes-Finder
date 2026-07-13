// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/User', () => ({
  default: { findOne: vi.fn(), create: vi.fn() },
}));
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn() } }));
vi.mock('@/lib/email', () => ({ sendEmailVerificationOtpEmail: vi.fn() }));

import { POST } from '@/app/api/auth/register/route';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { sendEmailVerificationOtpEmail } from '@/lib/email';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a request missing required fields', async () => {
    const res = await POST(makeRequest({ name: 'Ada' }));
    expect(res.status).toBe(400);
    expect(connectToDatabase).not.toHaveBeenCalled();
  });

  it.each(['admin', 'super_admin', 'unassigned', 'anything-else'])(
    'rejects self-registration with role %s (privileged roles come from the allowlists only)',
    async (role) => {
      const res = await POST(
        makeRequest({ name: 'Mallory', email: 'mallory@example.com', password: 'secret123', role })
      );
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.error).toMatch(/invalid role/i);
      expect(User.create).not.toHaveBeenCalled();
    }
  );

  it('creates a school account queued for admin verification (pending)', async () => {
    (User.findOne as any).mockResolvedValue(null);
    (bcrypt.hash as any).mockResolvedValue('hashed-password');
    (User.create as any).mockResolvedValue({ _id: 's1' });
    (sendEmailVerificationOtpEmail as any).mockResolvedValue(undefined);

    const res = await POST(
      makeRequest({ name: 'University of Lagos', email: 'siwes@unilag.edu.ng', password: 'secret123', role: 'school' })
    );

    expect(res.status).toBe(201);
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'University of Lagos',
        email: 'siwes@unilag.edu.ng',
        password: 'hashed-password',
        role: 'school',
        verificationStatus: 'pending',
        verifyOtpHash: 'hashed-password',
        verifyOtpExpires: expect.any(Date),
        verifyOtpAttempts: 0,
      })
    );
  });

  it('rejects a malformed email address', async () => {
    const res = await POST(
      makeRequest({ name: 'Ada', email: 'not-an-email', password: 'secret123', role: 'student' })
    );
    expect(res.status).toBe(400);
    expect(User.create).not.toHaveBeenCalled();
  });

  it('rejects a password shorter than 6 characters', async () => {
    const res = await POST(
      makeRequest({ name: 'Ada', email: 'ada@example.com', password: 'abc', role: 'student' })
    );
    expect(res.status).toBe(400);
    expect(User.create).not.toHaveBeenCalled();
  });

  it('translates a duplicate-key race (E11000) into the same 409 as the pre-check', async () => {
    (User.findOne as any).mockResolvedValue(null);
    (bcrypt.hash as any).mockResolvedValue('hashed-password');
    (User.create as any).mockRejectedValue(Object.assign(new Error('dup'), { code: 11000 }));

    const res = await POST(
      makeRequest({ name: 'Ada', email: 'ada@example.com', password: 'secret123', role: 'student' })
    );
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toMatch(/already exists/i);
  });

  it('rejects registration for an email that already exists', async () => {
    (User.findOne as any).mockResolvedValue({ _id: '1', email: 'ada@example.com' });

    const res = await POST(
      makeRequest({ name: 'Ada', email: 'ada@example.com', password: 'secret123', role: 'student' })
    );
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toMatch(/already exists/i);
    expect(User.create).not.toHaveBeenCalled();
  });

  it('hashes the password and creates the user on success', async () => {
    (User.findOne as any).mockResolvedValue(null);
    (bcrypt.hash as any).mockResolvedValue('hashed-password');
    (User.create as any).mockResolvedValue({ _id: '1' });
    (sendEmailVerificationOtpEmail as any).mockResolvedValue(undefined);

    const res = await POST(
      makeRequest({ name: 'Ada', email: 'ada@example.com', password: 'secret123', role: 'student' })
    );

    expect(res.status).toBe(201);
    expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 10);
    expect(User.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Ada',
        email: 'ada@example.com',
        password: 'hashed-password',
        role: 'student',
        verifyOtpHash: 'hashed-password',
        verifyOtpExpires: expect.any(Date),
        verifyOtpAttempts: 0,
      })
    );
  });

  it('sends the new account a verification code', async () => {
    (User.findOne as any).mockResolvedValue(null);
    (bcrypt.hash as any).mockResolvedValue('hashed-password');
    (User.create as any).mockResolvedValue({ _id: '1' });
    (sendEmailVerificationOtpEmail as any).mockResolvedValue(undefined);

    const res = await POST(
      makeRequest({ name: 'Ada', email: 'ada@example.com', password: 'secret123', role: 'student' })
    );

    expect(res.status).toBe(201);
    const [emailedTo, emailedOtp] = (sendEmailVerificationOtpEmail as any).mock.calls[0];
    expect(emailedTo).toBe('ada@example.com');
    expect(emailedOtp).toMatch(/^\d{6}$/);
  });

  it('still creates the account when the verification email fails to send', async () => {
    (User.findOne as any).mockResolvedValue(null);
    (bcrypt.hash as any).mockResolvedValue('hashed-password');
    (User.create as any).mockResolvedValue({ _id: '1' });
    (sendEmailVerificationOtpEmail as any).mockRejectedValue(new Error('Resend is down'));

    const res = await POST(
      makeRequest({ name: 'Ada', email: 'ada@example.com', password: 'secret123', role: 'student' })
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.message).toMatch(/created successfully/i);
  });

  it('returns 500 when persisting the user fails', async () => {
    (User.findOne as any).mockResolvedValue(null);
    (bcrypt.hash as any).mockResolvedValue('hashed-password');
    (User.create as any).mockRejectedValue(new Error('DB is down'));

    const res = await POST(
      makeRequest({ name: 'Ada', email: 'ada@example.com', password: 'secret123', role: 'student' })
    );
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('DB is down');
  });
});
