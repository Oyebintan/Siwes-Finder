// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/Application', () => ({ default: { findOneAndUpdate: vi.fn() } }));

import { PUT } from '@/app/api/applications/[id]/route';
import { getServerSession } from 'next-auth/next';
import Application from '@/models/Application';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/applications/app1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PUT /api/applications/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-employer sessions', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    const res = await PUT(makeRequest({ status: 'Accepted' }), { params: Promise.resolve({ id: 'app1' }) });
    expect(res.status).toBe(401);
  });

  it('rejects an invalid status', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const res = await PUT(makeRequest({ status: 'Pending' }), { params: Promise.resolve({ id: 'app1' }) });
    expect(res.status).toBe(400);
    expect(Application.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('404s when the application does not belong to this employer', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (Application.findOneAndUpdate as any).mockResolvedValue(null);

    const res = await PUT(makeRequest({ status: 'Accepted' }), { params: Promise.resolve({ id: 'app1' }) });
    expect(res.status).toBe(404);
  });

  it('accepts an application scoped to the owning employer', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (Application.findOneAndUpdate as any).mockResolvedValue({ _id: 'app1', status: 'Accepted' });

    const res = await PUT(makeRequest({ status: 'Accepted' }), { params: Promise.resolve({ id: 'app1' }) });

    expect(res.status).toBe(200);
    expect(Application.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'app1', employer: 'emp1' },
      { status: 'Accepted' },
      { new: true }
    );
  });
});
