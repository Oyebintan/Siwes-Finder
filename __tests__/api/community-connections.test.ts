// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/User', () => ({ default: { findById: vi.fn() } }));
vi.mock('@/models/Connection', () => ({ default: { find: vi.fn(), findOne: vi.fn(), create: vi.fn() } }));

import { GET, POST } from '@/app/api/community/connections/route';
import { getServerSession } from 'next-auth/next';
import User from '@/models/User';
import Connection from '@/models/Connection';

function mockRequester(communityJoined: boolean | null) {
  (User.findById as any).mockReturnValue({
    select: vi.fn().mockResolvedValue(communityJoined === null ? null : { communityJoined }),
  });
}

function mockConnectionsList(list: unknown[]) {
  (Connection.find as any).mockReturnValue({
    populate: vi.fn().mockReturnValue({
      populate: vi.fn().mockReturnValue({
        sort: vi.fn().mockResolvedValue(list),
      }),
    }),
  });
}

function makePostRequest(body: unknown) {
  return new Request('http://localhost/api/community/connections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/community/connections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    (getServerSession as any).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('rejects students who have not joined the community', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    mockRequester(false);
    const res = await GET();
    expect(res.status).toBe(403);
    expect(Connection.find).not.toHaveBeenCalled();
  });

  it('splits connections into accepted / incoming / outgoing pending', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    mockRequester(true);
    mockConnectionsList([
      { _id: 'c1', status: 'accepted', requester: { _id: 'u1', name: 'Me' }, recipient: { _id: 'u2', name: 'Bob' } },
      { _id: 'c2', status: 'pending', requester: { _id: 'u1', name: 'Me' }, recipient: { _id: 'u3', name: 'Carol' } },
      { _id: 'c3', status: 'pending', requester: { _id: 'u4', name: 'Dan' }, recipient: { _id: 'u1', name: 'Me' } },
    ]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.accepted).toHaveLength(1);
    expect(data.accepted[0].peer.name).toBe('Bob');
    expect(data.outgoingPending).toHaveLength(1);
    expect(data.outgoingPending[0].peer.name).toBe('Carol');
    expect(data.incomingPending).toHaveLength(1);
    expect(data.incomingPending[0].peer.name).toBe('Dan');
  });
});

describe('POST /api/community/connections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    (getServerSession as any).mockResolvedValue(null);
    const res = await POST(makePostRequest({ studentId: 'u2' }));
    expect(res.status).toBe(401);
  });

  it('rejects students who have not joined the community', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    mockRequester(false);
    const res = await POST(makePostRequest({ studentId: 'u2' }));
    expect(res.status).toBe(403);
  });

  it('rejects connecting to yourself', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    mockRequester(true);
    const res = await POST(makePostRequest({ studentId: 'u1' }));
    expect(res.status).toBe(400);
  });

  it('404s when the target student is not available', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    (User.findById as any)
      .mockReturnValueOnce({ select: vi.fn().mockResolvedValue({ communityJoined: true }) })
      .mockReturnValueOnce({ select: vi.fn().mockResolvedValue(null) });
    const res = await POST(makePostRequest({ studentId: 'u2' }));
    expect(res.status).toBe(404);
  });

  it('rejects when already connected', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    (User.findById as any)
      .mockReturnValueOnce({ select: vi.fn().mockResolvedValue({ communityJoined: true }) })
      .mockReturnValueOnce({ select: vi.fn().mockResolvedValue({ role: 'student', communityJoined: true }) });
    (Connection.findOne as any).mockResolvedValue({ status: 'accepted', requester: { toString: () => 'u1' } });

    const res = await POST(makePostRequest({ studentId: 'u2' }));
    expect(res.status).toBe(400);
  });

  it('rejects a duplicate outgoing request', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    (User.findById as any)
      .mockReturnValueOnce({ select: vi.fn().mockResolvedValue({ communityJoined: true }) })
      .mockReturnValueOnce({ select: vi.fn().mockResolvedValue({ role: 'student', communityJoined: true }) });
    (Connection.findOne as any).mockResolvedValue({ status: 'pending', requester: { toString: () => 'u1' } });

    const res = await POST(makePostRequest({ studentId: 'u2' }));
    expect(res.status).toBe(400);
  });

  it('auto-accepts when the target already requested me', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    (User.findById as any)
      .mockReturnValueOnce({ select: vi.fn().mockResolvedValue({ communityJoined: true }) })
      .mockReturnValueOnce({ select: vi.fn().mockResolvedValue({ role: 'student', communityJoined: true }) });
    const save = vi.fn().mockResolvedValue(undefined);
    const existing = { status: 'pending', requester: { toString: () => 'u2' }, save };
    (Connection.findOne as any).mockResolvedValue(existing);

    const res = await POST(makePostRequest({ studentId: 'u2' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(existing.status).toBe('accepted');
    expect(save).toHaveBeenCalledTimes(1);
    expect(data.status).toBe('accepted');
  });

  it('creates a new pending request when none exists', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    (User.findById as any)
      .mockReturnValueOnce({ select: vi.fn().mockResolvedValue({ communityJoined: true }) })
      .mockReturnValueOnce({ select: vi.fn().mockResolvedValue({ role: 'student', communityJoined: true }) });
    (Connection.findOne as any).mockResolvedValue(null);
    (Connection.create as any).mockResolvedValue({ _id: 'c1', requester: 'u1', recipient: 'u2', status: 'pending' });

    const res = await POST(makePostRequest({ studentId: 'u2' }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(Connection.create).toHaveBeenCalledWith({ requester: 'u1', recipient: 'u2', status: 'pending' });
    expect(data.status).toBe('pending');
  });
});
