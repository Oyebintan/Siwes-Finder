// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/User', () => ({ default: { findOne: vi.fn() } }));
vi.mock('bcryptjs', () => ({ default: { compare: vi.fn() } }));
vi.mock('@/lib/mobileAuth', () => ({ issueMobileToken: vi.fn() }));

import { POST } from '@/app/api/mobile/login/route';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { issueMobileToken } from '@/lib/mobileAuth';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/mobile/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/mobile/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a request missing email or password', async () => {
    const res = await POST(makeRequest({ email: 'ada@example.com' }));
    expect(res.status).toBe(400);
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('rejects an unknown email without revealing which field was wrong', async () => {
    (User.findOne as any).mockResolvedValue(null);

    const res = await POST(makeRequest({ email: 'nobody@example.com', password: 'secret123' }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toMatch(/invalid email or password/i);
    expect(issueMobileToken).not.toHaveBeenCalled();
  });

  it('rejects a Google-only account (no password set)', async () => {
    (User.findOne as any).mockResolvedValue({ email: 'ada@example.com', password: undefined });

    const res = await POST(makeRequest({ email: 'ada@example.com', password: 'secret123' }));
    expect(res.status).toBe(401);
  });

  it('rejects an incorrect password with the same message as an unknown email', async () => {
    (User.findOne as any).mockResolvedValue({ email: 'ada@example.com', password: 'hashed' });
    (bcrypt.compare as any).mockResolvedValue(false);

    const res = await POST(makeRequest({ email: 'ada@example.com', password: 'wrong' }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toMatch(/invalid email or password/i);
  });

  it('issues a bearer token and the user record on success', async () => {
    const user = {
      _id: { toString: () => 'u1' },
      email: 'ada@example.com',
      name: 'Ada',
      role: 'student',
      password: 'hashed',
      emailVerified: true,
    };
    (User.findOne as any).mockResolvedValue(user);
    (bcrypt.compare as any).mockResolvedValue(true);
    (issueMobileToken as any).mockResolvedValue('signed-jwt');

    const res = await POST(makeRequest({ email: 'ada@example.com', password: 'secret123' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.token).toBe('signed-jwt');
    expect(data.user).toEqual({ id: 'u1', role: 'student', email: 'ada@example.com', name: 'Ada', emailVerified: true });
    expect(issueMobileToken).toHaveBeenCalledWith({
      id: 'u1',
      role: 'student',
      email: 'ada@example.com',
      name: 'Ada',
      emailVerified: true,
    });
  });

  it('reports an unverified account as verified when verification is switched off (the default)', async () => {
    const user = {
      _id: { toString: () => 'u1' },
      email: 'ada@example.com',
      name: 'Ada',
      role: 'student',
      password: 'hashed',
      emailVerified: false,
    };
    (User.findOne as any).mockResolvedValue(user);
    (bcrypt.compare as any).mockResolvedValue(true);
    (issueMobileToken as any).mockResolvedValue('signed-jwt');

    const res = await POST(makeRequest({ email: 'ada@example.com', password: 'secret123' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    // Keeps pre-existing unverified accounts out of the verify-email screen
    // while the flow is off (see lib/emailVerification.ts).
    expect(data.user.emailVerified).toBe(true);
  });

  it('reports an unverified account truthfully when verification is on', async () => {
    process.env.REQUIRE_EMAIL_VERIFICATION = 'true';
    try {
      const user = {
        _id: { toString: () => 'u1' },
        email: 'ada@example.com',
        name: 'Ada',
        role: 'student',
        password: 'hashed',
        emailVerified: false,
      };
      (User.findOne as any).mockResolvedValue(user);
      (bcrypt.compare as any).mockResolvedValue(true);
      (issueMobileToken as any).mockResolvedValue('signed-jwt');

      const res = await POST(makeRequest({ email: 'ada@example.com', password: 'secret123' }));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.user.emailVerified).toBe(false);
    } finally {
      delete process.env.REQUIRE_EMAIL_VERIFICATION;
    }
  });
});
