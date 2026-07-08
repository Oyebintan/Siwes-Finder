// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/Connection', () => ({ default: { findOne: vi.fn() } }));
vi.mock('@/models/DirectMessage', () => ({ default: { find: vi.fn(), create: vi.fn() } }));

import { GET, POST } from '@/app/api/community/dm/[studentId]/route';
import { getServerSession } from 'next-auth/next';
import Connection from '@/models/Connection';
import DirectMessage from '@/models/DirectMessage';

function makeGetRequest(query = '') {
  return new Request(`http://localhost/api/community/dm/u2${query}`);
}
function makePostRequest(body: unknown) {
  return new Request('http://localhost/api/community/dm/u2', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
function params(studentId = 'u2') {
  return { params: Promise.resolve({ studentId }) };
}

describe('GET /api/community/dm/[studentId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    (getServerSession as any).mockResolvedValue(null);
    const res = await GET(makeGetRequest(), params());
    expect(res.status).toBe(401);
  });

  it('rejects when there is no accepted connection', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    (Connection.findOne as any).mockResolvedValue(null);
    const res = await GET(makeGetRequest(), params());
    expect(res.status).toBe(403);
    expect(DirectMessage.find).not.toHaveBeenCalled();
  });

  it('returns recent messages newest-limited then chronological', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    (Connection.findOne as any).mockResolvedValue({ status: 'accepted' });
    const sortMock = vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([{ _id: 'm2' }, { _id: 'm1' }]) });
    (DirectMessage.find as any).mockReturnValue({ sort: sortMock });

    const res = await GET(makeGetRequest(), params());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.messages).toEqual([{ _id: 'm1' }, { _id: 'm2' }]);
  });

  it('applies the since filter for polling', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    (Connection.findOne as any).mockResolvedValue({ status: 'accepted' });
    const sortMock = vi.fn().mockResolvedValue([{ _id: 'm3' }]);
    (DirectMessage.find as any).mockReturnValue({ sort: sortMock });

    const since = new Date().toISOString();
    const res = await GET(makeGetRequest(`?since=${encodeURIComponent(since)}`), params());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.messages).toEqual([{ _id: 'm3' }]);
  });
});

describe('POST /api/community/dm/[studentId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    (getServerSession as any).mockResolvedValue(null);
    const res = await POST(makePostRequest({ text: 'hi' }), params());
    expect(res.status).toBe(401);
  });

  it('rejects when there is no accepted connection', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    (Connection.findOne as any).mockResolvedValue(null);
    const res = await POST(makePostRequest({ text: 'hi' }), params());
    expect(res.status).toBe(403);
    expect(DirectMessage.create).not.toHaveBeenCalled();
  });

  it('rejects empty messages', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    (Connection.findOne as any).mockResolvedValue({ status: 'accepted' });
    const res = await POST(makePostRequest({ text: '   ' }), params());
    expect(res.status).toBe(400);
  });

  it('rejects messages over the length limit', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    (Connection.findOne as any).mockResolvedValue({ status: 'accepted' });
    const res = await POST(makePostRequest({ text: 'x'.repeat(1001) }), params());
    expect(res.status).toBe(400);
  });

  it('creates and returns the direct message', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    (Connection.findOne as any).mockResolvedValue({ status: 'accepted' });
    (DirectMessage.create as any).mockResolvedValue({ _id: 'm1', from: 'u1', to: 'u2', text: 'hello' });

    const res = await POST(makePostRequest({ text: '  hello  ' }), params());
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(DirectMessage.create).toHaveBeenCalledWith({ from: 'u1', to: 'u2', text: 'hello' });
    expect(data.message._id).toBe('m1');
  });
});
