// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mobileAuth', () => ({ requireSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/Application', () => ({ default: { find: vi.fn(), updateMany: vi.fn() } }));
vi.mock('@/models/Job', () => ({ default: { findById: vi.fn() } }));
vi.mock('@/models/User', () => ({ default: { findById: vi.fn() } }));
vi.mock('@/lib/push', () => ({ sendPushNotification: vi.fn() }));
vi.mock('@/lib/email', () => ({ sendApplicationDecisionEmail: vi.fn() }));

import { PATCH } from '@/app/api/applications/bulk/route';
import { requireSession } from '@/lib/mobileAuth';
import Application from '@/models/Application';
import User from '@/models/User';
import { sendApplicationDecisionEmail } from '@/lib/email';

function makeRequest(body: unknown) {
  return new Request('http://localhost/api/applications/bulk', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function mockNoPushOrEmail() {
  (User.findById as any).mockReturnValue({ select: vi.fn().mockResolvedValue(null) });
}

describe('PATCH /api/applications/bulk', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNoPushOrEmail();
  });

  it('rejects non-employer sessions', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    const res = await PATCH(makeRequest({ ids: ['a1'], status: 'Accepted' }));
    expect(res.status).toBe(401);
  });

  it('rejects an empty id list', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const res = await PATCH(makeRequest({ ids: [], status: 'Accepted' }));
    expect(res.status).toBe(400);
    expect(Application.find).not.toHaveBeenCalled();
  });

  it('rejects more than 100 ids', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const res = await PATCH(makeRequest({ ids: Array.from({ length: 101 }, (_, i) => `a${i}`), status: 'Accepted' }));
    expect(res.status).toBe(400);
    expect(Application.find).not.toHaveBeenCalled();
  });

  it('rejects an invalid status', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const res = await PATCH(makeRequest({ ids: ['a1'], status: 'Pending' }));
    expect(res.status).toBe(400);
    expect(Application.find).not.toHaveBeenCalled();
  });

  it('404s when none of the ids are pending applications owned by this employer', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (Application.find as any).mockResolvedValue([]);

    const res = await PATCH(makeRequest({ ids: ['a1', 'a2'], status: 'Accepted' }));

    expect(res.status).toBe(404);
    expect(Application.updateMany).not.toHaveBeenCalled();
  });

  it('scopes the lookup to this employer\'s own pending applications', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (Application.find as any).mockResolvedValue([{ _id: 'a1', student: 'stu1', job: 'job1' }]);
    (Application.updateMany as any).mockResolvedValue({});

    await PATCH(makeRequest({ ids: ['a1', 'a2'], status: 'Accepted' }));

    expect(Application.find).toHaveBeenCalledWith({
      _id: { $in: ['a1', 'a2'] },
      employer: 'emp1',
      status: 'Pending',
    });
  });

  it('updates only the matched (still-pending, owned) applications', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (Application.find as any).mockResolvedValue([
      { _id: 'a1', student: 'stu1', job: 'job1' },
      { _id: 'a2', student: 'stu2', job: 'job1' },
    ]);
    (Application.updateMany as any).mockResolvedValue({});

    const res = await PATCH(makeRequest({ ids: ['a1', 'a2', 'a3'], status: 'Rejected' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.modifiedCount).toBe(2);
    expect(Application.updateMany).toHaveBeenCalledWith(
      { _id: { $in: ['a1', 'a2'] } },
      { status: 'Rejected' }
    );
  });

  it('best-effort emails every affected student, one failure never blocking another', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (Application.find as any).mockResolvedValue([
      { _id: 'a1', student: 'stu1', job: 'job1' },
      { _id: 'a2', student: 'stu2', job: 'job1' },
    ]);
    (Application.updateMany as any).mockResolvedValue({});
    (User.findById as any).mockImplementation((id: string) => ({
      select: vi.fn().mockResolvedValue(
        id === 'stu1'
          ? { email: 'ada@example.com', name: 'Ada' }
          : null // simulates a lookup that yields no contact info for stu2
      ),
    }));

    const res = await PATCH(makeRequest({ ids: ['a1', 'a2'], status: 'Accepted' }));

    expect(res.status).toBe(200);
    expect(sendApplicationDecisionEmail).toHaveBeenCalledTimes(1);
    expect(sendApplicationDecisionEmail).toHaveBeenCalledWith('ada@example.com', 'Ada', 'a placement', 'Accepted');
  });

  it('never fails the request when a notification throws', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (Application.find as any).mockResolvedValue([{ _id: 'a1', student: 'stu1', job: 'job1' }]);
    (Application.updateMany as any).mockResolvedValue({});
    (User.findById as any).mockImplementation(() => {
      throw new Error('DB unavailable');
    });

    const res = await PATCH(makeRequest({ ids: ['a1'], status: 'Accepted' }));
    expect(res.status).toBe(200);
  });
});
