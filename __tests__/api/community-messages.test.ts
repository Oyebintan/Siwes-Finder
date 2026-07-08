// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/User', () => ({ default: { findById: vi.fn() } }));
vi.mock('@/models/CommunityMessage', () => ({ default: { find: vi.fn(), create: vi.fn() } }));

import { GET, POST } from '@/app/api/community/messages/route';
import { getServerSession } from 'next-auth/next';
import User from '@/models/User';
import CommunityMessage from '@/models/CommunityMessage';

function mockRequester(communityJoined: boolean | null) {
  (User.findById as any).mockReturnValue({
    select: vi.fn().mockResolvedValue(communityJoined === null ? null : { communityJoined }),
  });
}

function makeGetRequest(query = '') {
  return new Request(`http://localhost/api/community/messages${query}`);
}

function makePostRequest(body: unknown) {
  return new Request('http://localhost/api/community/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/community/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    (getServerSession as any).mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('rejects students who have not joined the community', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    mockRequester(false);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(403);
    expect(CommunityMessage.find).not.toHaveBeenCalled();
  });

  it('returns recent messages, newest-limit then chronological', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    mockRequester(true);
    const reversed = [{ _id: 'm2' }, { _id: 'm1' }];
    const sortMock = vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue(reversed),
    });
    (CommunityMessage.find as any).mockReturnValue({
      populate: vi.fn().mockReturnValue({ sort: sortMock }),
    });

    const res = await GET(makeGetRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.messages).toEqual([{ _id: 'm1' }, { _id: 'm2' }]);
  });

  it('applies the since filter for incremental polling', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    mockRequester(true);
    const sortMock = vi.fn().mockResolvedValue([{ _id: 'm3' }]);
    (CommunityMessage.find as any).mockReturnValue({
      populate: vi.fn().mockReturnValue({ sort: sortMock }),
    });

    const since = new Date().toISOString();
    const res = await GET(makeGetRequest(`?since=${encodeURIComponent(since)}`));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.messages).toEqual([{ _id: 'm3' }]);
    expect(CommunityMessage.find).toHaveBeenCalledWith({ createdAt: { $gt: expect.any(Date) } });
  });
});

describe('POST /api/community/messages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    (getServerSession as any).mockResolvedValue(null);
    const res = await POST(makePostRequest({ text: 'hi' }));
    expect(res.status).toBe(401);
  });

  it('rejects students who have not joined the community', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    mockRequester(false);
    const res = await POST(makePostRequest({ text: 'hi' }));
    expect(res.status).toBe(403);
    expect(CommunityMessage.create).not.toHaveBeenCalled();
  });

  it('rejects empty messages', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    mockRequester(true);
    const res = await POST(makePostRequest({ text: '   ' }));
    expect(res.status).toBe(400);
  });

  it('rejects messages over the length limit', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    mockRequester(true);
    const res = await POST(makePostRequest({ text: 'x'.repeat(1001) }));
    expect(res.status).toBe(400);
  });

  it('creates and returns the posted message', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    mockRequester(true);
    const populate = vi.fn().mockResolvedValue(undefined);
    const created = { _id: 'm1', text: 'hello everyone', student: 'u1', populate };
    (CommunityMessage.create as any).mockResolvedValue(created);

    const res = await POST(makePostRequest({ text: '  hello everyone  ' }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(CommunityMessage.create).toHaveBeenCalledWith({ student: 'u1', text: 'hello everyone' });
    expect(populate).toHaveBeenCalledWith('student', 'name');
    expect(data.message._id).toBe('m1');
  });
});
