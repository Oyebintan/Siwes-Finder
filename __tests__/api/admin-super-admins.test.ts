// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/User', () => ({ default: { findOne: vi.fn() } }));

import { POST } from '@/app/api/admin/super-admins/route';
import { getServerSession } from 'next-auth/next';
import User from '@/models/User';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/admin/super-admins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/admin/super-admins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a plain admin (only super_admin may promote)', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'a1', role: 'admin' } });
    const res = await POST(makeRequest({ email: 'x@y.com' }));
    expect(res.status).toBe(403);
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('rejects unauthenticated requests', async () => {
    (getServerSession as any).mockResolvedValue(null);
    const res = await POST(makeRequest({ email: 'x@y.com' }));
    expect(res.status).toBe(403);
  });

  it('requires an email', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'sa1', role: 'super_admin' } });
    const res = await POST(makeRequest({ email: '  ' }));
    expect(res.status).toBe(400);
  });

  it('404s when no account exists for that email', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'sa1', role: 'super_admin' } });
    (User.findOne as any).mockResolvedValue(null);
    const res = await POST(makeRequest({ email: 'nobody@example.com' }));
    expect(res.status).toBe(404);
  });

  it('rejects promoting someone who is already a super admin', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'sa1', role: 'super_admin' } });
    (User.findOne as any).mockResolvedValue({ email: 'already@example.com', role: 'super_admin', save: vi.fn() });
    const res = await POST(makeRequest({ email: 'already@example.com' }));
    expect(res.status).toBe(400);
  });

  it('promotes an existing student/employer/admin to super_admin', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'sa1', role: 'super_admin' } });
    const save = vi.fn().mockResolvedValue(undefined);
    const target = { _id: 'u2', email: 'friend@example.com', role: 'employer', save };
    (User.findOne as any).mockResolvedValue(target);

    const res = await POST(makeRequest({ email: 'Friend@Example.com' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(target.role).toBe('super_admin');
    expect(save).toHaveBeenCalledTimes(1);
    expect(data.user.role).toBe('super_admin');
  });
});
