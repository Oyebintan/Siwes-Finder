// @vitest-environment node
// /api/auth/onboarding is an alias of /api/auth/role. These tests pin the
// endpoint to the guarded behavior so it can never silently revert to the
// old unguarded role-overwrite version.
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/User', () => ({
  default: { findById: vi.fn(), findByIdAndUpdate: vi.fn() },
}));

import { POST } from '@/app/api/auth/onboarding/route';
import { getServerSession } from 'next-auth/next';
import User from '@/models/User';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/auth/onboarding', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mockExistingRole(role: string | null) {
  (User.findById as any).mockReturnValue({
    select: vi.fn().mockResolvedValue(role === null ? null : { role }),
  });
}

describe('POST /api/auth/onboarding (alias of /api/auth/role)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects roles outside student/employer (e.g. admin self-promotion)', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1' } });
    const res = await POST(makeRequest({ role: 'admin' }));
    expect(res.status).toBe(400);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects overwriting a role that is already set (protects admins)', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1' } });
    mockExistingRole('admin');
    const res = await POST(makeRequest({ role: 'student' }));
    expect(res.status).toBe(403);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('assigns a first role to an unassigned account', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1' } });
    mockExistingRole('unassigned');
    (User.findByIdAndUpdate as any).mockResolvedValue({ _id: 'u1', role: 'student' });

    const res = await POST(makeRequest({ role: 'student' }));

    expect(res.status).toBe(200);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('u1', { role: 'student' }, { new: true });
  });
});
