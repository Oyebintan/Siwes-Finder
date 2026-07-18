// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mobileAuth', () => ({ requireSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/User', () => ({
  default: { findById: vi.fn(), findByIdAndUpdate: vi.fn() },
}));

import { POST } from '@/app/api/auth/role/route';
import { requireSession } from '@/lib/mobileAuth';
import User from '@/models/User';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/auth/role', {
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

describe('POST /api/auth/role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    (requireSession as any).mockResolvedValue(null);
    const res = await POST(makeRequest({ role: 'student' }));
    expect(res.status).toBe(401);
  });

  it('rejects roles outside student/employer (e.g. admin self-promotion)', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'u1' } });
    const res = await POST(makeRequest({ role: 'admin' }));
    expect(res.status).toBe(400);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('404s when the user record is gone', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'u1' } });
    mockExistingRole(null);
    const res = await POST(makeRequest({ role: 'student' }));
    expect(res.status).toBe(404);
  });

  it('rejects changing a role that is already set (e.g. protects an existing admin)', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'u1' } });
    mockExistingRole('admin');
    const res = await POST(makeRequest({ role: 'student' }));
    expect(res.status).toBe(403);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects changing an already-set employer role too', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'u1' } });
    mockExistingRole('employer');
    const res = await POST(makeRequest({ role: 'student' }));
    expect(res.status).toBe(403);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('updates the role on success when currently unassigned', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'u1' } });
    mockExistingRole('unassigned');
    (User.findByIdAndUpdate as any).mockResolvedValue({ _id: 'u1', role: 'employer' });

    const res = await POST(makeRequest({ role: 'employer' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.role).toBe('employer');
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('u1', { role: 'employer' }, { new: true });
  });
});
