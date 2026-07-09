// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/User', () => ({
  default: { findOne: vi.fn(), create: vi.fn() },
}));
vi.mock('bcryptjs', () => ({ default: { hash: vi.fn() } }));

import { POST } from '@/app/api/auth/register/route';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

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

    const res = await POST(
      makeRequest({ name: 'Ada', email: 'ada@example.com', password: 'secret123', role: 'student' })
    );

    expect(res.status).toBe(201);
    expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 10);
    expect(User.create).toHaveBeenCalledWith({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'hashed-password',
      role: 'student',
    });
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
