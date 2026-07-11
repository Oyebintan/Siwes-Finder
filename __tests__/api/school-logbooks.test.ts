// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mobileAuth', () => ({ requireSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/User', () => ({ default: { findById: vi.fn(), find: vi.fn() } }));
vi.mock('@/models/Logbook', () => ({ default: { find: vi.fn() } }));

import { GET } from '@/app/api/school/logbooks/route';
import { requireSession } from '@/lib/mobileAuth';
import User from '@/models/User';
import Logbook from '@/models/Logbook';

function mockSchoolAccount(verificationStatus: string, name = 'University of Lagos') {
  (User.findById as any).mockReturnValue({
    select: vi.fn().mockResolvedValue({ _id: 'sch1', name, verificationStatus }),
  });
}

function makeRequest(query = '') {
  return new Request(`http://localhost/api/school/logbooks${query}`);
}

describe('GET /api/school/logbooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-school sessions', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('locks behind admin verification', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'sch1', role: 'school' } });
    mockSchoolAccount('pending');

    const res = await GET(makeRequest());
    expect(res.status).toBe(403);
    expect(Logbook.find).not.toHaveBeenCalled();
  });

  it('enriches entries with student name/department and lists distinct departments', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'sch1', role: 'school' } });
    mockSchoolAccount('approved');

    (User.find as any).mockReturnValue({
      select: vi.fn().mockResolvedValue([
        { _id: 'stu1', name: 'Ada', courseOfStudy: 'Computer Science', faculty: 'Science' },
        { _id: 'stu2', name: 'Bode', courseOfStudy: 'Physics' },
      ]),
    });
    (Logbook.find as any).mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        { _id: 'log1', studentId: 'stu1', weekNumber: 1, dayOfWeek: 'Monday', activityDescription: 'Setup', hoursWorked: 8, isApproved: true, date: new Date() },
        { _id: 'log2', studentId: 'stu2', weekNumber: 1, dayOfWeek: 'Monday', activityDescription: 'Lab work', hoursWorked: 6, isApproved: false, date: new Date() },
      ]),
    });

    const res = await GET(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.entries).toHaveLength(2);
    expect(data.entries[0]).toMatchObject({ studentName: 'Ada', department: 'Computer Science' });
    expect(data.departments.sort()).toEqual(['Computer Science', 'Physics']);
  });

  it('filters by department after enrichment', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'sch1', role: 'school' } });
    mockSchoolAccount('approved');

    (User.find as any).mockReturnValue({
      select: vi.fn().mockResolvedValue([
        { _id: 'stu1', name: 'Ada', courseOfStudy: 'Computer Science' },
        { _id: 'stu2', name: 'Bode', courseOfStudy: 'Physics' },
      ]),
    });
    (Logbook.find as any).mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        { _id: 'log1', studentId: 'stu1', weekNumber: 1, dayOfWeek: 'Monday', activityDescription: 'Setup', hoursWorked: 8, isApproved: true, date: new Date() },
        { _id: 'log2', studentId: 'stu2', weekNumber: 1, dayOfWeek: 'Monday', activityDescription: 'Lab work', hoursWorked: 6, isApproved: false, date: new Date() },
      ]),
    });

    const res = await GET(makeRequest('?department=Physics'));
    const data = await res.json();

    expect(data.entries).toHaveLength(1);
    expect(data.entries[0].studentName).toBe('Bode');
  });

  it('filters by approval status via the Logbook query', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'sch1', role: 'school' } });
    mockSchoolAccount('approved');
    (User.find as any).mockReturnValue({ select: vi.fn().mockResolvedValue([]) });
    (Logbook.find as any).mockReturnValue({ sort: vi.fn().mockResolvedValue([]) });

    await GET(makeRequest('?status=approved'));
    expect((Logbook.find as any).mock.calls[0][0]).toMatchObject({ isApproved: true });
  });
});
