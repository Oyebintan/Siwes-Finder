// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { isJobOpenForApplications } from '@/lib/jobStatus';

function makeJob(overrides: Record<string, unknown> = {}) {
  return {
    isActive: true,
    applicantCount: 0,
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as any;
}

describe('isJobOpenForApplications', () => {
  it('returns false without saving when the job is already inactive', async () => {
    const job = makeJob({ isActive: false });
    expect(await isJobOpenForApplications(job)).toBe(false);
    expect(job.save).not.toHaveBeenCalled();
  });

  it('returns true and does not save when there is no deadline or cap', async () => {
    const job = makeJob();
    expect(await isJobOpenForApplications(job)).toBe(true);
    expect(job.save).not.toHaveBeenCalled();
  });

  it('returns true when the deadline is in the future', async () => {
    const job = makeJob({ applicationDeadline: new Date(Date.now() + 86_400_000) });
    expect(await isJobOpenForApplications(job)).toBe(true);
    expect(job.save).not.toHaveBeenCalled();
  });

  it('closes and saves the job once the deadline has passed', async () => {
    const job = makeJob({ applicationDeadline: new Date(Date.now() - 86_400_000) });
    expect(await isJobOpenForApplications(job)).toBe(false);
    expect(job.isActive).toBe(false);
    expect(job.save).toHaveBeenCalled();
  });

  it('returns true when the applicant cap has not been reached', async () => {
    const job = makeJob({ maxApplicants: 5, applicantCount: 4 });
    expect(await isJobOpenForApplications(job)).toBe(true);
    expect(job.save).not.toHaveBeenCalled();
  });

  it('closes and saves the job once the applicant cap is reached', async () => {
    const job = makeJob({ maxApplicants: 5, applicantCount: 5 });
    expect(await isJobOpenForApplications(job)).toBe(false);
    expect(job.isActive).toBe(false);
    expect(job.save).toHaveBeenCalled();
  });
});
