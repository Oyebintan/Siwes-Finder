// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/Application', () => ({ default: { find: vi.fn() } }));
vi.mock('@/models/Logbook', () => ({ default: { aggregate: vi.fn() } }));
vi.mock('@/models/User', () => ({ default: { find: vi.fn() } }));
vi.mock('@/lib/push', () => ({ sendPushNotification: vi.fn() }));

import { POST } from '@/app/api/cron/logbook-streak-reminders/route';
import Application from '@/models/Application';
import Logbook from '@/models/Logbook';
import User from '@/models/User';
import { sendPushNotification } from '@/lib/push';

const DAY_MS = 24 * 60 * 60 * 1000;

function makeRequest(secretHeader?: string) {
  return new Request('http://localhost/api/cron/logbook-streak-reminders', {
    method: 'POST',
    headers: secretHeader ? { 'x-cron-secret': secretHeader } : {},
  });
}

describe('POST /api/cron/logbook-streak-reminders', () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = 'test-secret';
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it('rejects a request with no secret header', async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(Application.find).not.toHaveBeenCalled();
  });

  it('rejects a request with the wrong secret', async () => {
    const res = await POST(makeRequest('wrong'));
    expect(res.status).toBe(401);
  });

  it('rejects every request when CRON_SECRET is unset (fails closed, not open)', async () => {
    delete process.env.CRON_SECRET;
    const res = await POST(makeRequest('anything'));
    expect(res.status).toBe(401);
  });

  it('reports 0 reminders when nobody has an active placement', async () => {
    (Application.find as any).mockReturnValue({ select: vi.fn().mockResolvedValue([]) });

    const res = await POST(makeRequest('test-secret'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.reminded).toBe(0);
    expect(Logbook.aggregate).not.toHaveBeenCalled();
  });

  it('reminds a placed student whose last log entry is stale, skips a fresh one', async () => {
    const staleDate = new Date(Date.now() - 5 * DAY_MS);
    const freshDate = new Date(Date.now() - 1 * DAY_MS);
    (Application.find as any).mockReturnValue({
      select: vi.fn().mockResolvedValue([
        { student: 'stu-stale', updatedAt: new Date(Date.now() - 10 * DAY_MS) },
        { student: 'stu-fresh', updatedAt: new Date(Date.now() - 10 * DAY_MS) },
      ]),
    });
    (Logbook.aggregate as any).mockResolvedValue([
      { _id: 'stu-stale', lastDate: staleDate },
      { _id: 'stu-fresh', lastDate: freshDate },
    ]);
    (User.find as any).mockReturnValue({
      select: vi.fn().mockResolvedValue([{ _id: 'stu-stale', expoPushToken: 'tok-stale' }]),
    });

    const res = await POST(makeRequest('test-secret'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.reminded).toBe(1);
    expect(sendPushNotification).toHaveBeenCalledTimes(1);
    expect(sendPushNotification).toHaveBeenCalledWith(
      'tok-stale',
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ type: 'logbook-streak-reminder' })
    );
    // Only stu-stale should ever have been looked up for a push token.
    const userFilterArg = (User.find as any).mock.calls[0][0];
    expect(userFilterArg._id.$in).toEqual(['stu-stale']);
  });

  it('uses the placement acceptance date as the reference when the student has never logged', async () => {
    (Application.find as any).mockReturnValue({
      select: vi.fn().mockResolvedValue([{ student: 'stu-new', updatedAt: new Date(Date.now() - 10 * DAY_MS) }]),
    });
    (Logbook.aggregate as any).mockResolvedValue([]); // no entries ever
    (User.find as any).mockReturnValue({
      select: vi.fn().mockResolvedValue([{ _id: 'stu-new', expoPushToken: 'tok-new' }]),
    });

    const res = await POST(makeRequest('test-secret'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.reminded).toBe(1);
  });

  it("doesn't nag a placement accepted very recently with no logs yet", async () => {
    (Application.find as any).mockReturnValue({
      select: vi.fn().mockResolvedValue([{ student: 'stu-brandnew', updatedAt: new Date() }]),
    });
    (Logbook.aggregate as any).mockResolvedValue([]);

    const res = await POST(makeRequest('test-secret'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.reminded).toBe(0);
    expect(User.find).not.toHaveBeenCalled();
  });

  it('skips a due student silently when they have no registered push token', async () => {
    (Application.find as any).mockReturnValue({
      select: vi.fn().mockResolvedValue([{ student: 'stu-notoken', updatedAt: new Date(Date.now() - 10 * DAY_MS) }]),
    });
    (Logbook.aggregate as any).mockResolvedValue([{ _id: 'stu-notoken', lastDate: new Date(Date.now() - 5 * DAY_MS) }]);
    (User.find as any).mockReturnValue({ select: vi.fn().mockResolvedValue([{ _id: 'stu-notoken' }]) });

    const res = await POST(makeRequest('test-secret'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.reminded).toBe(0);
    expect(sendPushNotification).not.toHaveBeenCalled();
  });

  it('never fails the sweep when an individual push send throws', async () => {
    (Application.find as any).mockReturnValue({
      select: vi.fn().mockResolvedValue([{ student: 'stu-a', updatedAt: new Date(Date.now() - 10 * DAY_MS) }]),
    });
    (Logbook.aggregate as any).mockResolvedValue([{ _id: 'stu-a', lastDate: new Date(Date.now() - 5 * DAY_MS) }]);
    (User.find as any).mockReturnValue({ select: vi.fn().mockResolvedValue([{ _id: 'stu-a', expoPushToken: 'tok-a' }]) });
    (sendPushNotification as any).mockRejectedValue(new Error('DeviceNotRegistered'));

    const res = await POST(makeRequest('test-secret'));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.reminded).toBe(0);
  });
});
