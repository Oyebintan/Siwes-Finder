// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/Job', () => ({
  default: { create: vi.fn(), find: vi.fn(), countDocuments: vi.fn() },
}));
vi.mock('@/models/User', () => ({
  default: { findById: vi.fn(), find: vi.fn() },
}));

import { GET, POST } from '@/app/api/jobs/route';
import { getServerSession } from 'next-auth/next';
import Job from '@/models/Job';
import User from '@/models/User';

function makePostRequest(body: unknown) {
  return new Request('http://localhost/api/jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeGetRequest(query = '') {
  return new Request(`http://localhost/api/jobs${query}`);
}

const validJob = {
  title: 'Frontend Intern',
  location: 'Lagos',
  type: 'Remote',
  duration: '6 Months',
  requirements: ['React'],
  description: 'Build things.',
};

describe('POST /api/jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated/non-employer requests', async () => {
    (getServerSession as any).mockResolvedValue(null);
    const res = await POST(makePostRequest(validJob));
    expect(res.status).toBe(401);
  });

  it('rejects employers who are not verification-approved', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (User.findById as any).mockReturnValue({
      select: vi.fn().mockResolvedValue({ verificationStatus: 'pending' }),
    });

    const res = await POST(makePostRequest(validJob));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toMatch(/verified/i);
    expect(Job.create).not.toHaveBeenCalled();
  });

  it('rejects missing required fields for an approved employer', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (User.findById as any).mockReturnValue({
      select: vi.fn().mockResolvedValue({ verificationStatus: 'approved' }),
    });

    const res = await POST(makePostRequest({ title: 'Only a title' }));
    expect(res.status).toBe(400);
  });

  it('rejects an email application method without a valid email', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (User.findById as any).mockReturnValue({
      select: vi.fn().mockResolvedValue({ verificationStatus: 'approved' }),
    });

    const res = await POST(
      makePostRequest({ ...validJob, applicationMethod: 'email', applicationEmail: 'not-an-email' })
    );
    expect(res.status).toBe(400);
  });

  it('rejects an external application method without a valid URL', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (User.findById as any).mockReturnValue({
      select: vi.fn().mockResolvedValue({ verificationStatus: 'approved' }),
    });

    const res = await POST(
      makePostRequest({ ...validJob, applicationMethod: 'external', applicationUrl: 'not-a-url' })
    );
    expect(res.status).toBe(400);
  });

  it('rejects an invalid application deadline', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (User.findById as any).mockReturnValue({
      select: vi.fn().mockResolvedValue({ verificationStatus: 'approved' }),
    });

    const res = await POST(makePostRequest({ ...validJob, applicationDeadline: 'not-a-date' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/deadline/i);
    expect(Job.create).not.toHaveBeenCalled();
  });

  it('rejects a non-positive maxApplicants', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (User.findById as any).mockReturnValue({
      select: vi.fn().mockResolvedValue({ verificationStatus: 'approved' }),
    });

    const res = await POST(makePostRequest({ ...validJob, maxApplicants: 0 }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/positive whole number/i);
    expect(Job.create).not.toHaveBeenCalled();
  });

  it('creates the job for an approved employer with valid data', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (User.findById as any).mockReturnValue({
      select: vi.fn().mockResolvedValue({ verificationStatus: 'approved' }),
    });
    (Job.create as any).mockResolvedValue({ _id: 'job1', ...validJob });

    const res = await POST(makePostRequest(validJob));

    expect(res.status).toBe(201);
    expect(Job.create).toHaveBeenCalledWith(
      expect.objectContaining({ employerId: 'emp1', title: validJob.title, applicationMethod: 'platform' })
    );
  });

  it('creates the job with a valid application deadline and max applicants', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (User.findById as any).mockReturnValue({
      select: vi.fn().mockResolvedValue({ verificationStatus: 'approved' }),
    });
    (Job.create as any).mockResolvedValue({ _id: 'job1', ...validJob });

    const res = await POST(makePostRequest({ ...validJob, applicationDeadline: '2099-01-01', maxApplicants: 10 }));

    expect(res.status).toBe(201);
    expect(Job.create).toHaveBeenCalledWith(
      expect.objectContaining({ applicationDeadline: new Date('2099-01-01'), maxApplicants: 10 })
    );
  });
});

describe('GET /api/jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    (getServerSession as any).mockResolvedValue(null);
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it("returns the employer's own jobs, sorted newest first", async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const sort = vi.fn().mockResolvedValue([{ _id: 'job1' }]);
    (Job.find as any).mockReturnValue({ sort });

    const res = await GET(makeGetRequest());
    const data = await res.json();

    expect(Job.find).toHaveBeenCalledWith({ employerId: 'emp1' });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(data.jobs).toEqual([{ _id: 'job1' }]);
  });

  it('scopes the public feed to active jobs from approved employers and escapes search input', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.find as any).mockReturnValue({ distinct: vi.fn().mockResolvedValue(['emp1', 'emp2']) });
    (Job.countDocuments as any).mockResolvedValue(1);

    const populate = vi.fn().mockReturnThis();
    const sort = vi.fn().mockReturnThis();
    const skip = vi.fn().mockReturnThis();
    const limit = vi.fn().mockResolvedValue([{ _id: 'job1' }]);
    (Job.find as any).mockReturnValue({ populate, sort, skip, limit });

    // A regex metacharacter in the search query must not throw or be treated
    // as an unescaped pattern.
    const res = await GET(makeGetRequest('?q=c%2B%2B&type=Remote&location=Lagos'));
    const data = await res.json();

    expect(res.status).toBe(200);
    const filterArg = (Job.find as any).mock.calls[0][0];
    expect(filterArg.isActive).toBe(true);
    expect(filterArg.employerId).toEqual({ $in: ['emp1', 'emp2'] });
    expect(filterArg.type).toBe('Remote');
    const searchCondition = filterArg.$and.find((c: any) => c.$or?.[0]?.title);
    expect(searchCondition.$or[0].title.source).toContain('c\\+\\+');
    expect(data.jobs).toEqual([{ _id: 'job1' }]);
    expect(data.total).toBe(1);
  });

  it('matches search terms against skills, location and company, not just title/description', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    // First User.find: approved employer ids; second: employers whose
    // company name/industry matches the query.
    (User.find as any).mockReturnValue({ distinct: vi.fn().mockResolvedValue(['emp1']) });
    (Job.countDocuments as any).mockResolvedValue(0);

    const populate = vi.fn().mockReturnThis();
    const sort = vi.fn().mockReturnThis();
    const skip = vi.fn().mockReturnThis();
    const limit = vi.fn().mockResolvedValue([]);
    (Job.find as any).mockReturnValue({ populate, sort, skip, limit });

    await GET(makeGetRequest('?q=Adobe%20Photoshop'));

    const filterArg = (Job.find as any).mock.calls[0][0];
    const searchCondition = filterArg.$and.find((c: any) => c.$or?.[0]?.title);
    const orKeys = searchCondition.$or.map((c: any) => Object.keys(c)[0]);
    expect(orKeys).toEqual(['title', 'description', 'requirements', 'location', 'employerId']);
    expect(searchCondition.$or[2].requirements.source).toContain('Adobe Photoshop');
    // The company-name arm scopes to employers matched by the second User.find call.
    expect((User.find as any).mock.calls.length).toBe(2);
    expect((User.find as any).mock.calls[1][0].$or).toBeTruthy();
  });

  it('excludes jobs past their application deadline or at their applicant cap from the public feed', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.find as any).mockReturnValue({ distinct: vi.fn().mockResolvedValue(['emp1']) });
    (Job.countDocuments as any).mockResolvedValue(0);

    const populate = vi.fn().mockReturnThis();
    const sort = vi.fn().mockReturnThis();
    const skip = vi.fn().mockReturnThis();
    const limit = vi.fn().mockResolvedValue([]);
    (Job.find as any).mockReturnValue({ populate, sort, skip, limit });

    await GET(makeGetRequest());

    const filterArg = (Job.find as any).mock.calls[0][0];
    const deadlineCondition = filterArg.$and.find((c: any) => c.$or?.[0]?.applicationDeadline !== undefined);
    const capCondition = filterArg.$and.find((c: any) => c.$expr);
    expect(deadlineCondition).toBeTruthy();
    expect(capCondition.$expr.$or[1]).toEqual({ $lt: ['$applicantCount', '$maxApplicants'] });
  });
});
