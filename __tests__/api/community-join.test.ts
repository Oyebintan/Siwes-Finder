// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/User', () => ({ default: { findByIdAndUpdate: vi.fn() } }));

import { POST } from '@/app/api/community/join/route';
import { getServerSession } from 'next-auth/next';
import User from '@/models/User';

function mockUpdateResult(result: { communityJoined: boolean } | null) {
  (User.findByIdAndUpdate as any).mockReturnValue({
    select: vi.fn().mockResolvedValue(result),
  });
}

describe('POST /api/community/join', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    (getServerSession as any).mockResolvedValue(null);
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it('rejects non-student roles', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'employer' } });
    const res = await POST();
    expect(res.status).toBe(401);
  });

  it('404s when the user record is gone', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    mockUpdateResult(null);
    const res = await POST();
    expect(res.status).toBe(404);
  });

  it('opts the student into the community', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    mockUpdateResult({ communityJoined: true });

    const res = await POST();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.communityJoined).toBe(true);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith(
      'u1',
      { $set: { communityJoined: true } },
      { new: true }
    );
  });
});
