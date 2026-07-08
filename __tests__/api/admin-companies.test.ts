// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/User', () => ({ default: { find: vi.fn(), findOne: vi.fn() } }));

import { GET } from '@/app/api/admin/companies/route';
import { PATCH } from '@/app/api/admin/companies/[id]/route';
import { getServerSession } from 'next-auth/next';
import User from '@/models/User';

function makeGetRequest(query = '') {
  return new Request(`http://localhost/api/admin/companies${query}`);
}

function makePatchRequest(body: unknown) {
  return new Request('http://localhost/api/admin/companies/c1', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/admin/companies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-admin sessions', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'employer' } });
    const res = await GET(makeGetRequest());
    expect(res.status).toBe(401);
  });

  it('defaults to pending companies', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'admin1', role: 'admin' } });
    const select = vi.fn().mockReturnThis();
    const sort = vi.fn().mockResolvedValue([]);
    (User.find as any).mockReturnValue({ select, sort });

    await GET(makeGetRequest());

    expect(User.find).toHaveBeenCalledWith({ role: 'employer', verificationStatus: 'pending' });
  });

  it('omits the verificationStatus filter for ?status=all', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'admin1', role: 'admin' } });
    const select = vi.fn().mockReturnThis();
    const sort = vi.fn().mockResolvedValue([]);
    (User.find as any).mockReturnValue({ select, sort });

    await GET(makeGetRequest('?status=all'));

    expect(User.find).toHaveBeenCalledWith({ role: 'employer' });
  });
});

describe('PATCH /api/admin/companies/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-admin sessions', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'employer' } });
    const res = await PATCH(makePatchRequest({ action: 'approve' }), { params: Promise.resolve({ id: 'c1' }) });
    expect(res.status).toBe(401);
  });

  it('rejects an invalid action', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'admin1', role: 'admin' } });
    const res = await PATCH(makePatchRequest({ action: 'delete' }), { params: Promise.resolve({ id: 'c1' }) });
    expect(res.status).toBe(400);
  });

  it('404s when the company does not exist', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'admin1', role: 'admin' } });
    (User.findOne as any).mockResolvedValue(null);

    const res = await PATCH(makePatchRequest({ action: 'approve' }), { params: Promise.resolve({ id: 'missing' }) });
    expect(res.status).toBe(404);
  });

  it('approves a company and clears any prior rejection reason', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'admin1', role: 'admin' } });
    const company: any = {
      verificationStatus: 'rejected',
      verificationRejectionReason: 'Bad CAC doc',
      save: vi.fn().mockResolvedValue(undefined),
    };
    (User.findOne as any).mockResolvedValue(company);

    const res = await PATCH(makePatchRequest({ action: 'approve' }), { params: Promise.resolve({ id: 'c1' }) });

    expect(res.status).toBe(200);
    expect(company.verificationStatus).toBe('approved');
    expect(company.verificationRejectionReason).toBeUndefined();
    expect(company.save).toHaveBeenCalled();
  });

  it('rejects a company with a default reason when none is provided', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'admin1', role: 'admin' } });
    const company: any = { verificationStatus: 'pending', save: vi.fn().mockResolvedValue(undefined) };
    (User.findOne as any).mockResolvedValue(company);

    const res = await PATCH(makePatchRequest({ action: 'reject' }), { params: Promise.resolve({ id: 'c1' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(company.verificationStatus).toBe('rejected');
    expect(company.verificationRejectionReason).toBe('No reason provided.');
    expect(data.verificationStatus).toBe('rejected');
  });
});
