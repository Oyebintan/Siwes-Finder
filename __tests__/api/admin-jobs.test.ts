// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/Job', () => ({ default: { find: vi.fn(), countDocuments: vi.fn() } }));

import { GET } from '@/app/api/admin/jobs/route';
import { getServerSession } from 'next-auth/next';
import Job from '@/models/Job';

function makeRequest(query = '') {
  return new Request(`http://localhost/api/admin/jobs${query}`);
}

describe('GET /api/admin/jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-admin sessions', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'employer' } });
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('returns every job (no isActive filter) with pagination', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'admin1', role: 'admin' } });
    (Job.countDocuments as any).mockResolvedValue(60);
    const populate = vi.fn().mockReturnThis();
    const sort = vi.fn().mockReturnThis();
    const skip = vi.fn().mockReturnThis();
    const limit = vi.fn().mockResolvedValue([{ _id: 'job1' }]);
    (Job.find as any).mockReturnValue({ populate, sort, skip, limit });

    const res = await GET(makeRequest('?page=2&limit=25'));
    const data = await res.json();

    expect(Job.find).toHaveBeenCalledWith({});
    expect(skip).toHaveBeenCalledWith(25);
    expect(limit).toHaveBeenCalledWith(25);
    expect(data.totalPages).toBe(3);
  });

  it('caps the page size at 100', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'admin1', role: 'admin' } });
    (Job.countDocuments as any).mockResolvedValue(5);
    const populate = vi.fn().mockReturnThis();
    const sort = vi.fn().mockReturnThis();
    const skip = vi.fn().mockReturnThis();
    const limit = vi.fn().mockResolvedValue([]);
    (Job.find as any).mockReturnValue({ populate, sort, skip, limit });

    await GET(makeRequest('?limit=500'));

    expect(limit).toHaveBeenCalledWith(100);
  });
});
