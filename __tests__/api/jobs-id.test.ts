// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/mobileAuth', () => ({ requireSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/Job', () => ({ default: { findById: vi.fn(), findOne: vi.fn() } }));
vi.mock('@/models/Application', () => ({ default: { deleteMany: vi.fn() } }));
vi.mock('@/models/User', () => ({ default: { findById: vi.fn() } }));
vi.mock('@/lib/email', () => ({ sendJobTakedownEmail: vi.fn() }));

import { DELETE, GET, PUT } from '@/app/api/jobs/[id]/route';
import { getServerSession } from 'next-auth/next';
import { requireSession } from '@/lib/mobileAuth';
import Job from '@/models/Job';
import Application from '@/models/Application';
import User from '@/models/User';
import { sendJobTakedownEmail } from '@/lib/email';

function makeGetRequest() {
  return new Request('http://localhost/api/jobs/job1');
}
function makePutRequest(body: unknown) {
  return new Request('http://localhost/api/jobs/job1', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}
function makeDeleteRequest() {
  return new Request('http://localhost/api/jobs/job1', { method: 'DELETE' });
}
const p = { params: Promise.resolve({ id: 'job1' }) };

describe('GET /api/jobs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    (requireSession as any).mockResolvedValue(null);
    const req = makeGetRequest();
    const res = await GET(req, p);
    expect(res.status).toBe(401);
    expect(requireSession).toHaveBeenCalledWith(req);
  });

  it('404s when the job does not exist', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    const populate = vi.fn().mockResolvedValue(null);
    (Job.findById as any).mockReturnValue({ populate });

    const res = await GET(makeGetRequest(), p);
    expect(res.status).toBe(404);
  });

  it('hides an inactive job from a non-owner, non-admin (404, not 403 — avoids leaking existence)', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    const populate = vi.fn().mockResolvedValue({
      _id: 'job1',
      isActive: false,
      employerId: { _id: { toString: () => 'emp1' }, verificationStatus: 'approved' },
    });
    (Job.findById as any).mockReturnValue({ populate });

    const res = await GET(makeGetRequest(), p);
    expect(res.status).toBe(404);
  });

  it('hides a job from an unverified employer', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    const populate = vi.fn().mockResolvedValue({
      _id: 'job1',
      isActive: true,
      employerId: { _id: { toString: () => 'emp1' }, verificationStatus: 'pending' },
    });
    (Job.findById as any).mockReturnValue({ populate });

    const res = await GET(makeGetRequest(), p);
    expect(res.status).toBe(404);
  });

  it('lets the owning employer see their own inactive/unverified job', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const jobDoc = {
      _id: 'job1',
      isActive: false,
      employerId: { _id: { toString: () => 'emp1' }, verificationStatus: 'pending' },
    };
    const populate = vi.fn().mockResolvedValue(jobDoc);
    (Job.findById as any).mockReturnValue({ populate });

    const res = await GET(makeGetRequest(), p);
    expect(res.status).toBe(200);
  });

  it('lets an admin see any job regardless of status', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'admin1', role: 'admin' } });
    const jobDoc = {
      _id: 'job1',
      isActive: false,
      employerId: { _id: { toString: () => 'emp1' }, verificationStatus: 'pending' },
    };
    const populate = vi.fn().mockResolvedValue(jobDoc);
    (Job.findById as any).mockReturnValue({ populate });

    const res = await GET(makeGetRequest(), p);
    expect(res.status).toBe(200);
  });

  it('lets a super_admin see any job regardless of status', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'sa1', role: 'super_admin' } });
    const jobDoc = {
      _id: 'job1',
      isActive: false,
      employerId: { _id: { toString: () => 'emp1' }, verificationStatus: 'pending' },
    };
    const populate = vi.fn().mockResolvedValue(jobDoc);
    (Job.findById as any).mockReturnValue({ populate });

    const res = await GET(makeGetRequest(), p);
    expect(res.status).toBe(200);
  });
});

describe('PUT /api/jobs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-employer sessions', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    const res = await PUT(makePutRequest({ title: 'New title' }), p);
    expect(res.status).toBe(401);
  });

  it('404s when the job is not owned by this employer', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (Job.findOne as any).mockResolvedValue(null);

    const res = await PUT(makePutRequest({ title: 'New title' }), p);
    expect(res.status).toBe(404);
  });

  it('only applies allow-listed fields, ignoring unknown keys', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const jobDoc: any = { set: vi.fn(), save: vi.fn().mockResolvedValue(undefined) };
    (Job.findOne as any).mockResolvedValue(jobDoc);

    const res = await PUT(makePutRequest({ title: 'New title', employerId: 'someone-else' }), p);

    expect(res.status).toBe(200);
    expect(jobDoc.set).toHaveBeenCalledWith('title', 'New title');
    expect(jobDoc.set).not.toHaveBeenCalledWith('employerId', expect.anything());
    expect(jobDoc.save).toHaveBeenCalled();
  });

  it('rejects switching to email application method without a valid email', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const jobDoc: any = { set: vi.fn(), save: vi.fn() };
    (Job.findOne as any).mockResolvedValue(jobDoc);

    const res = await PUT(makePutRequest({ applicationMethod: 'email', applicationEmail: 'not-an-email' }), p);

    expect(res.status).toBe(400);
    expect(jobDoc.save).not.toHaveBeenCalled();
  });

  it('switches to external application method and clears the unused email field', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const jobDoc: any = { set: vi.fn(), save: vi.fn().mockResolvedValue(undefined) };
    (Job.findOne as any).mockResolvedValue(jobDoc);

    const res = await PUT(
      makePutRequest({ applicationMethod: 'external', applicationUrl: 'https://company.com/apply' }),
      p
    );

    expect(res.status).toBe(200);
    expect(jobDoc.applicationMethod).toBe('external');
    expect(jobDoc.applicationUrl).toBe('https://company.com/apply');
    expect(jobDoc.applicationEmail).toBeUndefined();
  });

  it('rejects an invalid application deadline', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const jobDoc: any = { set: vi.fn(), save: vi.fn() };
    (Job.findOne as any).mockResolvedValue(jobDoc);

    const res = await PUT(makePutRequest({ applicationDeadline: 'not-a-date' }), p);

    expect(res.status).toBe(400);
    expect(jobDoc.save).not.toHaveBeenCalled();
  });

  it('rejects a non-positive maxApplicants', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const jobDoc: any = { set: vi.fn(), save: vi.fn() };
    (Job.findOne as any).mockResolvedValue(jobDoc);

    const res = await PUT(makePutRequest({ maxApplicants: -1 }), p);

    expect(res.status).toBe(400);
    expect(jobDoc.save).not.toHaveBeenCalled();
  });

  it('clears the deadline and cap when explicitly set to null', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const jobDoc: any = {
      set: vi.fn(),
      save: vi.fn().mockResolvedValue(undefined),
      applicationDeadline: new Date(),
      maxApplicants: 5,
    };
    (Job.findOne as any).mockResolvedValue(jobDoc);

    const res = await PUT(makePutRequest({ applicationDeadline: null, maxApplicants: null }), p);

    expect(res.status).toBe(200);
    expect(jobDoc.applicationDeadline).toBeUndefined();
    expect(jobDoc.maxApplicants).toBeUndefined();
  });

  it('updates the deadline and cap with valid values', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const jobDoc: any = { set: vi.fn(), save: vi.fn().mockResolvedValue(undefined) };
    (Job.findOne as any).mockResolvedValue(jobDoc);

    const res = await PUT(makePutRequest({ applicationDeadline: '2099-01-01', maxApplicants: 20 }), p);

    expect(res.status).toBe(200);
    expect(jobDoc.applicationDeadline).toEqual(new Date('2099-01-01'));
    expect(jobDoc.maxApplicants).toBe(20);
  });
});

describe('DELETE /api/jobs/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    (getServerSession as any).mockResolvedValue(null);
    const res = await DELETE(makeDeleteRequest(), p);
    expect(res.status).toBe(401);
  });

  it("404s when a non-admin employer targets a job they don't own", async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (Job.findOne as any).mockResolvedValue(null);

    const res = await DELETE(makeDeleteRequest(), p);

    expect(res.status).toBe(404);
    expect(Job.findOne).toHaveBeenCalledWith({ _id: 'job1', employerId: 'emp1' });
  });

  it('lets an admin delete any job by id alone, emailing the employer about the takedown', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'admin1', role: 'admin' } });
    const jobDoc: any = { _id: 'job1', title: 'Frontend Intern', employerId: 'emp1', deleteOne: vi.fn().mockResolvedValue(undefined) };
    (Job.findOne as any).mockResolvedValue(jobDoc);
    (User.findById as any).mockReturnValue({
      select: vi.fn().mockResolvedValue({ email: 'hr@acme.com', companyName: 'Acme Ltd', name: 'Acme' }),
    });

    const res = await DELETE(makeDeleteRequest(), p);

    expect(res.status).toBe(200);
    expect(Job.findOne).toHaveBeenCalledWith({ _id: 'job1' });
    expect(Application.deleteMany).toHaveBeenCalledWith({ job: 'job1' });
    expect(jobDoc.deleteOne).toHaveBeenCalled();
    expect(sendJobTakedownEmail).toHaveBeenCalledWith('hr@acme.com', 'Acme Ltd', 'Frontend Intern');
  });

  it('still deletes when the takedown email fails (best-effort)', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'admin1', role: 'admin' } });
    const jobDoc: any = { _id: 'job1', title: 'Frontend Intern', employerId: 'emp1', deleteOne: vi.fn().mockResolvedValue(undefined) };
    (Job.findOne as any).mockResolvedValue(jobDoc);
    (User.findById as any).mockReturnValue({
      select: vi.fn().mockResolvedValue({ email: 'hr@acme.com', companyName: 'Acme Ltd', name: 'Acme' }),
    });
    (sendJobTakedownEmail as any).mockRejectedValue(new Error('Resend down'));

    const res = await DELETE(makeDeleteRequest(), p);

    expect(res.status).toBe(200);
    expect(jobDoc.deleteOne).toHaveBeenCalled();
  });

  it('lets a super_admin delete any job by id alone', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'sa1', role: 'super_admin' } });
    const jobDoc: any = { _id: 'job1', title: 'Frontend Intern', employerId: 'emp1', deleteOne: vi.fn().mockResolvedValue(undefined) };
    (Job.findOne as any).mockResolvedValue(jobDoc);
    (User.findById as any).mockReturnValue({
      select: vi.fn().mockResolvedValue({ email: 'hr@acme.com', companyName: 'Acme Ltd', name: 'Acme' }),
    });

    const res = await DELETE(makeDeleteRequest(), p);

    expect(res.status).toBe(200);
    expect(Job.findOne).toHaveBeenCalledWith({ _id: 'job1' });
    expect(jobDoc.deleteOne).toHaveBeenCalled();
  });

  it('deletes the job and its applications for the owning employer', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const jobDoc: any = { _id: 'job1', deleteOne: vi.fn().mockResolvedValue(undefined) };
    (Job.findOne as any).mockResolvedValue(jobDoc);

    const res = await DELETE(makeDeleteRequest(), p);

    expect(res.status).toBe(200);
    expect(Application.deleteMany).toHaveBeenCalledWith({ job: 'job1' });
    expect(jobDoc.deleteOne).toHaveBeenCalled();
  });
});
