// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/Connection', () => ({ default: { findById: vi.fn() } }));

import { POST } from '@/app/api/community/connections/[id]/route';
import { getServerSession } from 'next-auth/next';
import Connection from '@/models/Connection';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/community/connections/c1', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function call(body: unknown, id = 'c1') {
  return POST(makeRequest(body), { params: Promise.resolve({ id }) });
}

describe('POST /api/community/connections/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    (getServerSession as any).mockResolvedValue(null);
    const res = await call({ action: 'accept' });
    expect(res.status).toBe(401);
  });

  it('rejects an invalid action', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    const res = await call({ action: 'nonsense' });
    expect(res.status).toBe(400);
  });

  it('404s when the connection does not exist', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    (Connection.findById as any).mockResolvedValue(null);
    const res = await call({ action: 'accept' });
    expect(res.status).toBe(404);
  });

  it("404s when the caller isn't the request's recipient", async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    (Connection.findById as any).mockResolvedValue({ recipient: { toString: () => 'someone-else' }, status: 'pending' });
    const res = await call({ action: 'accept' });
    expect(res.status).toBe(404);
  });

  it('rejects responding to an already-handled request', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    (Connection.findById as any).mockResolvedValue({ recipient: { toString: () => 'u1' }, status: 'accepted' });
    const res = await call({ action: 'accept' });
    expect(res.status).toBe(400);
  });

  it('declines by deleting the connection', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    const deleteOne = vi.fn().mockResolvedValue(undefined);
    (Connection.findById as any).mockResolvedValue({ recipient: { toString: () => 'u1' }, status: 'pending', deleteOne });
    const res = await call({ action: 'decline' });
    expect(res.status).toBe(200);
    expect(deleteOne).toHaveBeenCalledTimes(1);
  });

  it('accepts and saves the connection', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    const save = vi.fn().mockResolvedValue(undefined);
    const connection = { recipient: { toString: () => 'u1' }, status: 'pending', save };
    (Connection.findById as any).mockResolvedValue(connection);

    const res = await call({ action: 'accept' });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(connection.status).toBe('accepted');
    expect(save).toHaveBeenCalledTimes(1);
    expect(data.status).toBe('accepted');
  });
});
