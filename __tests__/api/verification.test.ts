// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/mongodb', () => ({ connectToDatabase: vi.fn() }));
vi.mock('@/models/User', () => ({ default: { findById: vi.fn() } }));

import { GET, POST } from '@/app/api/companies/verification/route';
import { getServerSession } from 'next-auth/next';
import User from '@/models/User';

const validSubmission = {
  companyName: 'Paystack',
  cacNumber: 'RC12345',
  officialEmail: 'hr@paystack.com',
  verificationDocumentUrl: 'http://x/doc.pdf',
};

function makePostRequest(body: unknown) {
  return new Request('http://localhost/api/companies/verification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/companies/verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-employer sessions', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns the verification record for the employer', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const select = vi.fn().mockResolvedValue({ verificationStatus: 'pending' });
    (User.findById as any).mockReturnValue({ select });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.verification.verificationStatus).toBe('pending');
  });
});

describe('POST /api/companies/verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects non-employer sessions', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'u1', role: 'student' } });
    const res = await POST(makePostRequest(validSubmission));
    expect(res.status).toBe(401);
  });

  it('rejects a submission missing required fields', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const res = await POST(makePostRequest({ companyName: 'Paystack' }));
    expect(res.status).toBe(400);
  });

  it('rejects an invalid official email', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const res = await POST(makePostRequest({ ...validSubmission, officialEmail: 'not-an-email' }));
    expect(res.status).toBe(400);
  });

  it('refuses to resubmit an already-approved company', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    (User.findById as any).mockResolvedValue({ verificationStatus: 'approved' });

    const res = await POST(makePostRequest(validSubmission));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toMatch(/already verified/i);
  });

  it('saves the submission and moves status to pending', async () => {
    (getServerSession as any).mockResolvedValue({ user: { id: 'emp1', role: 'employer' } });
    const user: any = { verificationStatus: 'rejected', save: vi.fn().mockResolvedValue(undefined) };
    (User.findById as any).mockResolvedValue(user);

    const res = await POST(makePostRequest(validSubmission));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe('pending');
    expect(user.verificationStatus).toBe('pending');
    expect(user.companyName).toBe('Paystack');
    expect(user.save).toHaveBeenCalled();
  });
});
