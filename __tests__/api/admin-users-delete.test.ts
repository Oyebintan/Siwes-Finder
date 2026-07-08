// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/User', () => ({ default: { findById: vi.fn() } }));
vi.mock('@/models/Job', () => ({ default: { find: vi.fn(), deleteMany: vi.fn() } }));
vi.mock('@/models/Application', () => ({ default: { deleteMany: vi.fn() } }));

import { DELETE } from '@/app/api/admin/users/[id]/route';
import { getServerSession } from 'next-auth/next';
import User from '@/models/User';
import Job from '@/models/Job';
import Application from '@/models/Application';

function makeRequest() {
  return new Request('http://localhost/api/admin/users/u1', { method: 'DELETE' });
}

describe('DELETE /api/admin/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-admin sessions', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'admin1', role: 'employer' } });
    const res = await DELETE(makeRequest(), { params: Promise.resolve({ id: 'u1' }) });
    expect(res.status).toBe(401);
  });

  it('refuses to let an admin delete their own account', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'admin1', role: 'admin' } });
    const res = await DELETE(makeRequest(), { params: Promise.resolve({ id: 'admin1' }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/cannot delete your own/i);
    expect(User.findById).not.toHaveBeenCalled();
  });

  it('404s when the target user does not exist', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'admin1', role: 'admin' } });
    (User.findById as any).mockResolvedValue(null);

    const res = await DELETE(makeRequest(), { params: Promise.resolve({ id: 'missing' }) });
    expect(res.status).toBe(404);
  });

  it('deleting an employer also deletes their jobs and those jobs\' applications', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'admin1', role: 'admin' } });
    const user: any = { _id: 'emp1', role: 'employer', deleteOne: vi.fn().mockResolvedValue(undefined) };
    (User.findById as any).mockResolvedValue(user);
    const select = vi.fn().mockResolvedValue([{ _id: 'job1' }, { _id: 'job2' }]);
    (Job.find as any).mockReturnValue({ select });

    const res = await DELETE(makeRequest(), { params: Promise.resolve({ id: 'emp1' }) });

    expect(res.status).toBe(200);
    expect(Application.deleteMany).toHaveBeenCalledWith({ job: { $in: ['job1', 'job2'] } });
    expect(Job.deleteMany).toHaveBeenCalledWith({ employerId: 'emp1' });
    expect(user.deleteOne).toHaveBeenCalled();
  });

  it("deleting a student deletes their applications but not any jobs", async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'admin1', role: 'admin' } });
    const user: any = { _id: 'stu1', role: 'student', deleteOne: vi.fn().mockResolvedValue(undefined) };
    (User.findById as any).mockResolvedValue(user);

    const res = await DELETE(makeRequest(), { params: Promise.resolve({ id: 'stu1' }) });

    expect(res.status).toBe(200);
    expect(Application.deleteMany).toHaveBeenCalledWith({ student: 'stu1' });
    expect(Job.deleteMany).not.toHaveBeenCalled();
    expect(user.deleteOne).toHaveBeenCalled();
  });
});
