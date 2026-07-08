// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/Logbook', () => ({ default: { findOneAndUpdate: vi.fn() } }));

import { PUT } from '@/app/api/logbook/[id]/route';
import { getServerSession } from 'next-auth/next';
import Logbook from '@/models/Logbook';

function makeRequest() {
  return new Request('http://localhost/api/logbook/log1', { method: 'PUT' });
}

describe('PUT /api/logbook/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-employer sessions', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    const res = await PUT(makeRequest(), { params: Promise.resolve({ id: 'log1' }) });
    expect(res.status).toBe(401);
  });

  it('404s when the log does not belong to this employer', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (Logbook.findOneAndUpdate as any).mockResolvedValue(null);

    const res = await PUT(makeRequest(), { params: Promise.resolve({ id: 'log1' }) });
    expect(res.status).toBe(404);
  });

  it('approves the log entry scoped to the owning employer', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (Logbook.findOneAndUpdate as any).mockResolvedValue({ _id: 'log1', isApproved: true });

    const res = await PUT(makeRequest(), { params: Promise.resolve({ id: 'log1' }) });

    expect(res.status).toBe(200);
    expect(Logbook.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'log1', employerId: 'emp1' },
      { isApproved: true },
      { new: true }
    );
  });
});
