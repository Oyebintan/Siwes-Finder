// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/User', () => ({
  default: { find: vi.fn(), countDocuments: vi.fn() },
}));

import { GET } from '@/app/api/admin/users/route';
import { getServerSession } from 'next-auth/next';
import User from '@/models/User';

function makeRequest(query = '') {
  return new Request(`http://localhost/api/admin/users${query}`);
}

describe('GET /api/admin/users', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-admin sessions', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'employer' } });
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('accepts a super_admin session', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'sa1', role: 'super_admin' } });
    (User.countDocuments as any).mockResolvedValue(0);
    const select = vi.fn().mockReturnThis();
    const sort = vi.fn().mockReturnThis();
    const skip = vi.fn().mockReturnThis();
    const limit = vi.fn().mockResolvedValue([]);
    (User.find as any).mockReturnValue({ select, sort, skip, limit });

    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
  });

  it('ignores an unrecognized role filter', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'admin1', role: 'admin' } });
    (User.countDocuments as any).mockResolvedValue(0);
    const select = vi.fn().mockReturnThis();
    const sort = vi.fn().mockReturnThis();
    const skip = vi.fn().mockReturnThis();
    const limit = vi.fn().mockResolvedValue([]);
    (User.find as any).mockReturnValue({ select, sort, skip, limit });

    await GET(makeRequest('?role=superadmin'));

    expect(User.find).toHaveBeenCalledWith({});
    expect(User.countDocuments).toHaveBeenCalledWith({});
  });

  it('applies a valid role filter and paginates', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'admin1', role: 'admin' } });
    (User.countDocuments as any).mockResolvedValue(30);
    const select = vi.fn().mockReturnThis();
    const sort = vi.fn().mockReturnThis();
    const skip = vi.fn().mockReturnThis();
    const limit = vi.fn().mockResolvedValue([{ _id: 'u1' }]);
    (User.find as any).mockReturnValue({ select, sort, skip, limit });

    const res = await GET(makeRequest('?role=student&page=2&limit=10'));
    const data = await res.json();

    expect(User.find).toHaveBeenCalledWith({ role: 'student' });
    expect(skip).toHaveBeenCalledWith(10);
    expect(limit).toHaveBeenCalledWith(10);
    expect(data.totalPages).toBe(3);
  });
});
