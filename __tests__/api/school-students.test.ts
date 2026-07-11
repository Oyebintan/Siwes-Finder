// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/mobileAuth', () => ({ requireSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/User', () => ({ default: { findById: vi.fn(), find: vi.fn(), findOne: vi.fn() } }));
vi.mock('@/models/Application', () => ({ default: { find: vi.fn(), aggregate: vi.fn() } }));
vi.mock('@/models/Logbook', () => ({ default: { find: vi.fn(), aggregate: vi.fn() } }));

import { GET } from '@/app/api/school/students/route';
import { GET as GET_DETAIL } from '@/app/api/school/students/[id]/route';
import { requireSession } from '@/lib/mobileAuth';
import User from '@/models/User';
import Application from '@/models/Application';
import Logbook from '@/models/Logbook';

function makeRequest() {
  return new Request('http://localhost/api/school/students');
}

function mockSchoolAccount(verificationStatus: string, name = 'University of Lagos') {
  (User.findById as any).mockReturnValue({
    select: vi.fn().mockResolvedValue({ _id: 'sch1', name, verificationStatus }),
  });
}

describe('GET /api/school/students', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-school sessions', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'stu1', role: 'student' } });
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it('locks student records behind admin verification (403 while pending)', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'sch1', role: 'school' } });
    mockSchoolAccount('pending');

    const res = await GET(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toMatch(/awaiting admin verification/i);
    expect(User.find).not.toHaveBeenCalled();
  });

  it('returns students matched by university name with placement and logbook rollups', async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'sch1', role: 'school' } });
    mockSchoolAccount('approved');

    const students = [
      { _id: 'stu1', name: 'Ada', email: 'ada@x.com', courseOfStudy: 'Computer Science', faculty: 'Science' },
      { _id: 'stu2', name: 'Bode', email: 'bode@x.com', courseOfStudy: 'Physics' },
    ];
    const sort = vi.fn().mockResolvedValue(students);
    const select = vi.fn().mockReturnValue({ sort });
    (User.find as any).mockReturnValue({ select });

    const appSelect = vi.fn().mockResolvedValue([
      { student: 'stu1', employer: { companyName: 'Paystack' } },
    ]);
    const appPopulate = vi.fn().mockReturnValue({ select: appSelect });
    (Application.find as any).mockReturnValue({ populate: appPopulate });
    (Application.aggregate as any).mockResolvedValue([{ _id: 'stu1', total: 3 }]);
    (Logbook.aggregate as any).mockResolvedValue([{ _id: 'stu1', total: 10, approved: 7 }]);

    const res = await GET(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    // Match is against the school's institution name, case-insensitively.
    const filterArg = (User.find as any).mock.calls[0][0];
    expect(filterArg.role).toBe('student');
    expect(filterArg.university.test('university of lagos')).toBe(true);
    expect(filterArg.university.test('University of Ibadan')).toBe(false);

    const ada = data.students.find((s: any) => s._id === 'stu1');
    expect(ada.placedAt).toBe('Paystack');
    expect(ada.applicationCount).toBe(3);
    expect(ada.logbookEntries).toBe(10);
    expect(ada.logbookApproved).toBe(7);
    const bode = data.students.find((s: any) => s._id === 'stu2');
    expect(bode.placedAt).toBeNull();
  });
});

describe('GET /api/school/students/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("404s when the student isn't from this school", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'sch1', role: 'school' } });
    mockSchoolAccount('approved');
    (User.findOne as any).mockReturnValue({ select: vi.fn().mockResolvedValue(null) });

    const res = await GET_DETAIL(new Request('http://localhost/api/school/students/other'), {
      params: Promise.resolve({ id: 'other' }),
    });

    expect(res.status).toBe(404);
  });

  it("returns the student's profile, applications and logbook", async () => {
    (requireSession as any).mockResolvedValue({ user: { id: 'sch1', role: 'school' } });
    mockSchoolAccount('approved');
    (User.findOne as any).mockReturnValue({
      select: vi.fn().mockResolvedValue({ _id: 'stu1', name: 'Ada' }),
    });
    const appSort = vi.fn().mockResolvedValue([{ _id: 'app1' }]);
    const appPop2 = vi.fn().mockReturnValue({ sort: appSort });
    const appPop1 = vi.fn().mockReturnValue({ populate: appPop2 });
    (Application.find as any).mockReturnValue({ populate: appPop1 });
    (Logbook.find as any).mockReturnValue({ sort: vi.fn().mockResolvedValue([{ _id: 'log1' }]) });

    const res = await GET_DETAIL(new Request('http://localhost/api/school/students/stu1'), {
      params: Promise.resolve({ id: 'stu1' }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.student.name).toBe('Ada');
    expect(data.applications).toEqual([{ _id: 'app1' }]);
    expect(data.logbook).toEqual([{ _id: 'log1' }]);
    // The lookup itself is scoped to this school's students.
    const findOneArg = (User.findOne as any).mock.calls[0][0];
    expect(findOneArg._id).toBe('stu1');
    expect(findOneArg.role).toBe('student');
  });
});
