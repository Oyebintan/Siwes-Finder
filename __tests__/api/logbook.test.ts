// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/Logbook', () => ({ default: { create: vi.fn(), find: vi.fn() } }));
vi.mock('@/models/Application', () => ({ default: { findOne: vi.fn() } }));

import { GET, POST } from '@/app/api/logbook/route';
import { getServerSession } from 'next-auth/next';
import Logbook from '@/models/Logbook';
import Application from '@/models/Application';

function makePostRequest(body: unknown) {
  return new Request('http://localhost/api/logbook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validEntry = { weekNumber: 1, dayOfWeek: 'Monday', activityDescription: 'Set up dev env', hoursWorked: 8 };

describe('POST /api/logbook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-student sessions', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const res = await POST(makePostRequest(validEntry));
    expect(res.status).toBe(401);
  });

  it.each([
    ['missing description', { ...validEntry, activityDescription: '   ' }],
    ['missing week number', { ...validEntry, weekNumber: undefined }],
    ['non-numeric hours', { ...validEntry, hoursWorked: 'lots' }],
    ['zero hours', { ...validEntry, hoursWorked: 0 }],
    ['hours beyond a day', { ...validEntry, hoursWorked: 30 }],
  ])('rejects invalid input (%s) with a 400 instead of a 500', async (_label, body) => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });

    const res = await POST(makePostRequest(body));

    expect(res.status).toBe(400);
    expect(Logbook.create).not.toHaveBeenCalled();
  });

  it('refuses to log without an accepted placement', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (Application.findOne as any).mockResolvedValue(null);

    const res = await POST(makePostRequest(validEntry));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toMatch(/accepted/i);
    expect(Logbook.create).not.toHaveBeenCalled();
  });

  it('creates the entry against the employer from the accepted application', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (Application.findOne as any).mockResolvedValue({ employer: 'emp1' });
    (Logbook.create as any).mockResolvedValue({ _id: 'log1', ...validEntry });

    const res = await POST(makePostRequest(validEntry));

    expect(res.status).toBe(201);
    expect(Application.findOne).toHaveBeenCalledWith({ student: 'stu1', status: 'Accepted' });
    expect(Logbook.create).toHaveBeenCalledWith({
      studentId: 'stu1',
      employerId: 'emp1',
      weekNumber: 1,
      dayOfWeek: 'Monday',
      activityDescription: 'Set up dev env',
      hoursWorked: 8,
    });
  });
});

describe('GET /api/logbook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unauthenticated requests', async () => {
    (getServerSession as any).mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the student's own entries", async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    const sort = vi.fn().mockResolvedValue([{ _id: 'log1' }]);
    (Logbook.find as any).mockReturnValue({ sort });

    const res = await GET();
    const data = await res.json();

    expect(Logbook.find).toHaveBeenCalledWith({ studentId: 'stu1' });
    expect(data).toEqual([{ _id: 'log1' }]);
  });

  it("returns entries across the employer's students, unapproved first", async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const sort = vi.fn().mockResolvedValue([{ _id: 'log1' }]);
    const populate = vi.fn().mockReturnValue({ sort });
    (Logbook.find as any).mockReturnValue({ populate });

    await GET();

    expect(Logbook.find).toHaveBeenCalledWith({ employerId: 'emp1' });
    expect(sort).toHaveBeenCalledWith({ isApproved: 1, date: -1 });
  });
});
