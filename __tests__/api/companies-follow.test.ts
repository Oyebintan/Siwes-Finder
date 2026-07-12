// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mobileAuth', () => ({ requireSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/User', () => ({
  default: { findById: vi.fn(), findOne: vi.fn(), findByIdAndUpdate: vi.fn() },
}));

import { GET, POST } from '@/app/api/companies/[id]/follow/route';
import { requireSession } from '@/lib/mobileAuth';
import User from '@/models/User';

function makeRequest(method: 'GET' | 'POST') {
  return new Request('http://localhost/api/companies/emp1/follow', { method });
}

function mockFollowedEmployers(ids: string[]) {
  (User.findById as any).mockReturnValue({
    select: vi.fn().mockResolvedValue({ followedEmployers: ids }),
  });
}

describe('GET /api/companies/[id]/follow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-student sessions', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp2', role: 'employer' } });
    const res = await GET(makeRequest('GET'), { params: Promise.resolve({ id: 'emp1' }) });
    expect(res.status).toBe(401);
  });

  it('reports following: true when the employer id is in followedEmployers', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    mockFollowedEmployers(['emp1', 'emp2']);

    const res = await GET(makeRequest('GET'), { params: Promise.resolve({ id: 'emp1' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.following).toBe(true);
  });

  it('reports following: false when it is not', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    mockFollowedEmployers(['emp2']);

    const res = await GET(makeRequest('GET'), { params: Promise.resolve({ id: 'emp1' }) });
    const data = await res.json();

    expect(data.following).toBe(false);
  });
});

describe('POST /api/companies/[id]/follow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-student sessions', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp2', role: 'employer' } });
    const res = await POST(makeRequest('POST'), { params: Promise.resolve({ id: 'emp1' }) });
    expect(res.status).toBe(401);
  });

  it('404s when the employer does not exist', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findOne as any).mockReturnValue({ select: vi.fn().mockResolvedValue(null) });

    const res = await POST(makeRequest('POST'), { params: Promise.resolve({ id: 'missing' }) });

    expect(res.status).toBe(404);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('follows an unfollowed company ($addToSet) and reports following: true', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findOne as any).mockReturnValue({ select: vi.fn().mockResolvedValue({ _id: 'emp1' }) });
    mockFollowedEmployers([]);

    const res = await POST(makeRequest('POST'), { params: Promise.resolve({ id: 'emp1' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.following).toBe(true);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('stu1', { $addToSet: { followedEmployers: 'emp1' } });
  });

  it('unfollows an already-followed company ($pull) and reports following: false', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findOne as any).mockReturnValue({ select: vi.fn().mockResolvedValue({ _id: 'emp1' }) });
    mockFollowedEmployers(['emp1']);

    const res = await POST(makeRequest('POST'), { params: Promise.resolve({ id: 'emp1' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.following).toBe(false);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('stu1', { $pull: { followedEmployers: 'emp1' } });
  });
});
