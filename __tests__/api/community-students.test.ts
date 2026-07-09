// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/User', () => ({ default: { findById: vi.fn(), find: vi.fn() } }));
vi.mock('@/models/Application', () => ({ default: { find: vi.fn() } }));

import { GET } from '@/app/api/community/students/route';
import { getServerSession } from 'next-auth/next';
import User from '@/models/User';
import Application from '@/models/Application';

function mockRequester(communityJoined: boolean | null) {
  (User.findById as any).mockReturnValue({
    select: vi.fn().mockResolvedValue(communityJoined === null ? null : { communityJoined }),
  });
}

function mockDirectory(students: any[]) {
  (User.find as any).mockReturnValue({
    select: vi.fn().mockReturnValue({
      sort: vi.fn().mockResolvedValue(students),
    }),
  });
}

function mockAcceptedApps(apps: any[]) {
  (Application.find as any).mockReturnValue({
    select: vi.fn().mockReturnValue({
      populate: vi.fn().mockResolvedValue(apps),
    }),
  });
}

describe('GET /api/community/students', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    (getServerSession as any).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('rejects non-students', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'employer' } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('rejects students who have not joined the community', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    mockRequester(false);
    const res = await GET();
    expect(res.status).toBe(403);
    expect(User.find).not.toHaveBeenCalled();
  });

  it('returns the directory with derived SIWES status', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    mockRequester(true);
    mockDirectory([
      { _id: 'u1', name: 'Ada Lovelace', university: 'UNILAG', courseOfStudy: 'CS' },
      { _id: 'u2', name: 'Grace Hopper', university: 'OAU', courseOfStudy: 'EEE' },
    ]);
    mockAcceptedApps([
      { student: 'u1', employer: { companyName: 'Paystack' } },
    ]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.students).toHaveLength(2);
    expect(data.students[0].isCurrentlyOnSiwes).toBe(true);
    expect(data.students[0].status).toBe('On SIWES at Paystack');
    expect(data.students[1].isCurrentlyOnSiwes).toBe(false);
    expect(data.students[1].status).toBe('Not yet placed');
  });
});
