// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mobileAuth', () => ({ requireSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/Logbook', () => ({ default: { create: vi.fn(), find: vi.fn() } }));
vi.mock('@/models/Application', () => ({ default: { findOne: vi.fn() } }));

import { GET, POST } from '@/app/api/logbook/route';
import { requireSession } from '@/lib/mobileAuth';
import Logbook from '@/models/Logbook';
import Application from '@/models/Application';

function makePostRequest(body: unknown) {
  return new Request('http://localhost/api/logbook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeGetRequest() {
  return new Request('http://localhost/api/logbook');
}

const validEntry = { weekNumber: 1, dayOfWeek: 'Monday', activityDescription: 'Set up dev env', hoursWorked: 8 };

describe('POST /api/logbook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-student sessions', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const req = makePostRequest(validEntry);
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(requireSession).toHaveBeenCalledWith(req);
  });

  it.each([
    ['missing description', { ...validEntry, activityDescription: '   ' }],
    ['missing week number', { ...validEntry, weekNumber: undefined }],
    ['non-numeric hours', { ...validEntry, hoursWorked: 'lots' }],
    ['zero hours', { ...validEntry, hoursWorked: 0 }],
    ['hours beyond a day', { ...validEntry, hoursWorked: 30 }],
  ])('rejects invalid input (%s) with a 400 instead of a 500', async (_label, body) => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });

    const res = await POST(makePostRequest(body));

    expect(res.status).toBe(400);
    expect(Logbook.create).not.toHaveBeenCalled();
  });

  it('refuses to log without an accepted placement', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    (Application.findOne as any).mockResolvedValue(null);

    const res = await POST(makePostRequest(validEntry));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toMatch(/accepted/i);
    expect(Logbook.create).not.toHaveBeenCalled();
  });

  it('creates the entry against the employer from the accepted application', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
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
    (requireSession as any).mockResolvedValue(null);
    const req = makeGetRequest();
    const res = await GET(req);
    expect(res.status).toBe(401);
    expect(requireSession).toHaveBeenCalledWith(req);
  });

  it("returns the student's own entries", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    const sort = vi.fn().mockResolvedValue([{ _id: 'log1' }]);
    (Logbook.find as any).mockReturnValue({ sort });

    const res = await GET(makeGetRequest());
    const data = await res.json();

    expect(Logbook.find).toHaveBeenCalledWith({ studentId: 'stu1' });
    expect(data).toEqual([{ _id: 'log1' }]);
  });

  it("returns every entry tied to the employer's placements, unapproved-first", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const sort = vi.fn().mockResolvedValue([{ _id: 'log1', isApproved: false }]);
    const populate = vi.fn().mockReturnValue({ sort });
    (Logbook.find as any).mockReturnValue({ populate });

    const res = await GET(makeGetRequest());
    const data = await res.json();

    expect(Logbook.find).toHaveBeenCalledWith({ employerId: 'emp1' });
    expect(populate).toHaveBeenCalledWith('studentId', 'name email');
    expect(sort).toHaveBeenCalledWith({ isApproved: 1, date: -1 });
    expect(data).toEqual([{ _id: 'log1', isApproved: false }]);
  });

  it('rejects roles that are neither student nor employer', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'sch1', role: 'school' } });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
    expect(Logbook.find).not.toHaveBeenCalled();
  });
});
