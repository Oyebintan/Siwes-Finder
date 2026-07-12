// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/mobileAuth', () => ({ requireSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/Job', () => ({
  default: { create: vi.fn(), find: vi.fn(), countDocuments: vi.fn() },
}));
vi.mock('@/models/User', () => ({
  default: { findById: vi.fn(), find: vi.fn() },
}));
vi.mock('@/lib/push', () => ({ sendPushNotification: vi.fn() }));
vi.mock('@/lib/email', () => ({ sendNewJobAlertEmail: vi.fn() }));

import { GET, POST } from '@/app/api/jobs/route';
import { getServerSession } from 'next-auth/next';
import { requireSession } from '@/lib/mobileAuth';
import Job from '@/models/Job';
import User from '@/models/User';
import { sendPushNotification } from '@/lib/push';
import { sendNewJobAlertEmail } from '@/lib/email';

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
    (User.find as any).mockReturnValue({ select: vi.fn().mockResolvedValue([]) });
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
    (User.find as any).mockReturnValue({ select: vi.fn().mockResolvedValue([]) });
    (Job.create as any).mockResolvedValue({ _id: 'job1', ...validJob });

    const res = await POST(makePostRequest({ ...validJob, applicationDeadline: '2099-01-01', maxApplicants: 10 }));

    expect(res.status).toBe(201);
    expect(Job.create).toHaveBeenCalledWith(
      expect.objectContaining({ applicationDeadline: new Date('2099-01-01'), maxApplicants: 10 })
    );
  });

  it('best-effort alerts followers of the employer by email and push, keyed off followedEmployers', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (User.findById as any).mockImplementation((id: string) => ({
      select: vi.fn().mockResolvedValue(
        id === 'emp1' ? { verificationStatus: 'approved', companyName: 'Acme Ltd' } : null
      ),
    }));
    const followers = [
      { email: 'a@example.com', name: 'Ada', expoPushToken: 'tok-a' },
      { email: 'b@example.com', name: 'Bola' },
    ];
    (User.find as any).mockReturnValue({ select: vi.fn().mockResolvedValue(followers) });
    (Job.create as any).mockResolvedValue({ _id: 'job1', title: 'Frontend Intern' });

    const res = await POST(makePostRequest(validJob));

    expect(res.status).toBe(201);
    expect(User.find).toHaveBeenCalledWith({ followedEmployers: 'emp1' });
    expect(sendPushNotification).toHaveBeenCalledTimes(1);
    expect(sendPushNotification).toHaveBeenCalledWith(
      'tok-a',
      expect.any(String),
      expect.stringContaining('Frontend Intern'),
      expect.objectContaining({ type: 'new-job-alert' })
    );
    expect(sendNewJobAlertEmail).toHaveBeenCalledTimes(2);
    expect(sendNewJobAlertEmail).toHaveBeenCalledWith('a@example.com', 'Ada', 'Acme Ltd', 'Frontend Intern', 'job1');
    expect(sendNewJobAlertEmail).toHaveBeenCalledWith('b@example.com', 'Bola', 'Acme Ltd', 'Frontend Intern', 'job1');
  });

  it('never fails job creation when the follower-alert lookup throws', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (User.findById as any).mockReturnValue({
      select: vi.fn().mockResolvedValue({ verificationStatus: 'approved' }),
    });
    (User.find as any).mockImplementation(() => {
      throw new Error('DB unavailable');
    });
    (Job.create as any).mockResolvedValue({ _id: 'job1', ...validJob });

    const res = await POST(makePostRequest(validJob));

    expect(res.status).toBe(201);
  });
});

describe('GET /api/jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    (requireSession as any).mockResolvedValue(null);
    const req = makeGetRequest();
    const res = await GET(req);
    expect(res.status).toBe(401);
    // Confirms this route serves mobile bearer-token callers too: it must
    // hand the raw Request through to requireSession, not call the
    // cookie-only getServerSession directly.
    expect(requireSession).toHaveBeenCalledWith(req);
  });

  it("returns the employer's own jobs, sorted newest first", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const sort = vi.fn().mockResolvedValue([{ _id: 'job1' }]);
    (Job.find as any).mockReturnValue({ sort });

    const res = await GET(makeGetRequest());
    const data = await res.json();

    expect(Job.find).toHaveBeenCalledWith({ employerId: 'emp1' });
    expect(sort).toHaveBeenCalledWith({ createdAt: -1 });
    expect(data.jobs).toEqual([{ _id: 'job1' }]);
  });

  it('scopes the public feed to active jobs from approved employers and escapes search input', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findById as any).mockReturnValue({ select: vi.fn().mockResolvedValue({ skills: [] }) });
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
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findById as any).mockReturnValue({ select: vi.fn().mockResolvedValue({ skills: [] }) });
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
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findById as any).mockReturnValue({ select: vi.fn().mockResolvedValue({ skills: [] }) });
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

  it('attaches a matchScore to each job for a student with listed skills', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findById as any).mockReturnValue({
      select: vi.fn().mockResolvedValue({ skills: ['React', 'Node'], preferredState: 'Lagos' }),
    });
    (User.find as any).mockReturnValue({ distinct: vi.fn().mockResolvedValue(['emp1']) });
    (Job.countDocuments as any).mockResolvedValue(1);

    const populate = vi.fn().mockReturnThis();
    const sort = vi.fn().mockReturnThis();
    const skip = vi.fn().mockReturnThis();
    const limit = vi.fn().mockResolvedValue([{ _id: 'job1', requirements: ['React', 'CSS'], location: 'Lagos, Nigeria' }]);
    (Job.find as any).mockReturnValue({ populate, sort, skip, limit });

    const res = await GET(makeGetRequest());
    const data = await res.json();

    // 1 of 2 requirements matched (50%) + a 10-point boost for the
    // preferred-state/location match.
    expect(data.jobs[0].matchScore).toBe(60);
  });

  it('omits matchScore entirely for a student with no skills listed', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findById as any).mockReturnValue({ select: vi.fn().mockResolvedValue({ skills: [] }) });
    (User.find as any).mockReturnValue({ distinct: vi.fn().mockResolvedValue(['emp1']) });
    (Job.countDocuments as any).mockResolvedValue(1);

    const populate = vi.fn().mockReturnThis();
    const sort = vi.fn().mockReturnThis();
    const skip = vi.fn().mockReturnThis();
    const limit = vi.fn().mockResolvedValue([{ _id: 'job1', requirements: ['React'], location: 'Lagos' }]);
    (Job.find as any).mockReturnValue({ populate, sort, skip, limit });

    const res = await GET(makeGetRequest());
    const data = await res.json();

    expect(data.jobs[0].matchScore).toBeUndefined();
  });

  it('sorts by matchScore descending when sort=match', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (User.findById as any).mockReturnValue({ select: vi.fn().mockResolvedValue({ skills: ['React'] }) });
    (User.find as any).mockReturnValue({ distinct: vi.fn().mockResolvedValue(['emp1']) });
    (Job.countDocuments as any).mockResolvedValue(2);

    const populate = vi.fn().mockReturnThis();
    const limit = vi.fn().mockResolvedValue([
      { _id: 'low', requirements: ['Java'], location: 'Abuja' },
      { _id: 'high', requirements: ['React'], location: 'Abuja' },
    ]);
    (Job.find as any).mockReturnValue({ populate, limit });

    const res = await GET(makeGetRequest('?sort=match'));
    const data = await res.json();

    expect(data.jobs.map((j: any) => j._id)).toEqual(['high', 'low']);
  });
});
