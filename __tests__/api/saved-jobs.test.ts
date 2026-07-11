// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mobileAuth', () => ({ requireSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/User', () => ({
  default: { findById: vi.fn(), findByIdAndUpdate: vi.fn(), find: vi.fn() },
}));
vi.mock('@/models/Job', () => ({ default: { findById: vi.fn(), find: vi.fn() } }));

import { GET, POST } from '@/app/api/saved-jobs/route';
import { requireSession } from '@/lib/mobileAuth';
import User from '@/models/User';
import Job from '@/models/Job';

function makeGetRequest(query = '') {
  return new Request(`http://localhost/api/saved-jobs${query}`);
}

function makePostRequest(body: unknown) {
  return new Request('http://localhost/api/saved-jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mockSavedJobs(ids: string[]) {
  (User.findById as any).mockReturnValue({
    select: vi.fn().mockResolvedValue({ savedJobs: ids }),
  });
}

describe('GET /api/saved-jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-student sessions', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const req = makeGetRequest();
    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(requireSession).toHaveBeenCalledWith(req);
  });

  it('returns just the id list for ?ids=1', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    mockSavedJobs(['job1', 'job2']);

    const res = await GET(makeGetRequest('?ids=1'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ids).toEqual(['job1', 'job2']);
    expect(Job.find).not.toHaveBeenCalled();
  });

  it('returns populated cards filtered to visible jobs by default', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    mockSavedJobs(['job1', 'job2']);
    (User.find as any).mockReturnValue({ distinct: vi.fn().mockResolvedValue(['emp1']) });
    const sort = vi.fn().mockResolvedValue([{ _id: 'job1' }]);
    const populate = vi.fn().mockReturnValue({ sort });
    (Job.find as any).mockReturnValue({ populate });

    const res = await GET(makeGetRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Job.find).toHaveBeenCalledWith({
      _id: { $in: ['job1', 'job2'] },
      isActive: true,
      employerId: { $in: ['emp1'] },
    });
    expect(data.jobs).toEqual([{ _id: 'job1' }]);
  });
});

describe('POST /api/saved-jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-student sessions', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const req = makePostRequest({ jobId: 'job1' });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(requireSession).toHaveBeenCalledWith(req);
  });

  it('rejects a request missing jobId', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
  });

  it('404s when the job does not exist', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (Job.findById as any).mockReturnValue({ select: vi.fn().mockResolvedValue(null) });

    const res = await POST(makePostRequest({ jobId: 'missing' }));

    expect(res.status).toBe(404);
    expect(User.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('saves an unsaved job ($addToSet) and reports saved: true', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (Job.findById as any).mockReturnValue({ select: vi.fn().mockResolvedValue({ _id: 'job1' }) });
    mockSavedJobs([]);

    const res = await POST(makePostRequest({ jobId: 'job1' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.saved).toBe(true);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('stu1', { $addToSet: { savedJobs: 'job1' } });
  });

  it('unsaves an already-saved job ($pull) and reports saved: false', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (Job.findById as any).mockReturnValue({ select: vi.fn().mockResolvedValue({ _id: 'job1' }) });
    mockSavedJobs(['job1']);

    const res = await POST(makePostRequest({ jobId: 'job1' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.saved).toBe(false);
    expect(User.findByIdAndUpdate).toHaveBeenCalledWith('stu1', { $pull: { savedJobs: 'job1' } });
  });
});
