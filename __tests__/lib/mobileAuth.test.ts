// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('next-auth/jwt', () => ({ getToken: vi.fn(), encode: vi.fn() }));

import { issueMobileToken, requireSession } from '@/lib/mobileAuth';
import { getServerSession } from 'next-auth/next';
import { getToken, encode } from 'next-auth/jwt';

const user = { id: 'u1', role: 'student', email: 'ada@example.com', name: 'Ada' };

describe('issueMobileToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('encodes the user with the same NEXTAUTH_SECRET the web session uses', async () => {
    (encode as any).mockResolvedValue('signed-jwt');

    const token = await issueMobileToken(user);

    expect(token).toBe('signed-jwt');
    expect(encode).toHaveBeenCalledWith(
      expect.objectContaining({ token: user, secret: process.env.NEXTAUTH_SECRET, maxAge: 60 * 60 * 2 })
    );
  });

  it('refuses to issue a token when NEXTAUTH_SECRET is unset', async () => {
    const original = process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    try {
      await expect(issueMobileToken(user)).rejects.toThrow(/NEXTAUTH_SECRET/);
    } finally {
      process.env.NEXTAUTH_SECRET = original;
    }
  });
});

describe('requireSession', () => {
  const originalSecret = process.env.NEXTAUTH_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = originalSecret;
  });

  afterEach(() => {
    process.env.NEXTAUTH_SECRET = originalSecret;
  });

  it('prefers a cookie session over a bearer token when both are present', async () => {
    (getServerSession as any).mockResolvedValue({ user });

    const req = new Request('http://localhost/api/profile', { headers: { Authorization: 'Bearer some-token' } });
    const result = await requireSession(req);

    expect(result).toEqual({ user });
    expect(getToken).not.toHaveBeenCalled();
  });

  it('falls back to the Authorization: Bearer token when there is no cookie session', async () => {
    (getServerSession as any).mockResolvedValue(null);
    (getToken as any).mockResolvedValue({ id: 'u1', role: 'student', email: 'ada@example.com', name: 'Ada' });

    const req = new Request('http://localhost/api/profile', { headers: { Authorization: 'Bearer some-token' } });
    const result = await requireSession(req);

    expect(result).toEqual({ user: { id: 'u1', role: 'student', email: 'ada@example.com', name: 'Ada' } });
    expect(getToken).toHaveBeenCalledWith(expect.objectContaining({ req }));
  });

  it('returns null when neither a cookie session nor a valid bearer token is present', async () => {
    (getServerSession as any).mockResolvedValue(null);
    (getToken as any).mockResolvedValue(null);

    const req = new Request('http://localhost/api/profile');
    const result = await requireSession(req);

    expect(result).toBeNull();
  });

  it('returns null instead of throwing when NEXTAUTH_SECRET is unset', async () => {
    (getServerSession as any).mockResolvedValue(null);
    delete process.env.NEXTAUTH_SECRET;

    const req = new Request('http://localhost/api/profile');
    const result = await requireSession(req);

    expect(result).toBeNull();
    expect(getToken).not.toHaveBeenCalled();
  });
});
