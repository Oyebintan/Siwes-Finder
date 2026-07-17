// @vitest-environment node
import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import Job from '@/models/Job';

describe('Job model', () => {
  const employerId = new mongoose.Types.ObjectId();

  it('requires the core placement fields', async () => {
    // Note: `requirements` is an array, and Mongoose auto-initializes array
    // paths to `[]`, so `required: true` on it never actually fires.
    const job = new Job({});
    await expect(job.validate()).rejects.toMatchObject({
      errors: {
        employerId: expect.anything(),
        title: expect.anything(),
        location: expect.anything(),
        type: expect.anything(),
        duration: expect.anything(),
        department: expect.anything(),
        description: expect.anything(),
      },
    });
  });

  it('defaults isActive true and applicationMethod to platform', async () => {
    const job = new Job({
      employerId,
      title: 'Frontend Intern',
      location: 'Lagos',
      type: 'Remote',
      duration: '6 Months',
      department: 'Computer Science',
      requirements: ['React'],
      description: 'Build things.',
    });
    expect(job.isActive).toBe(true);
    expect(job.applicationMethod).toBe('platform');
    await expect(job.validate()).resolves.toBeUndefined();
  });

  it('rejects an invalid type', async () => {
    const job = new Job({
      employerId,
      title: 'Intern',
      location: 'Lagos',
      type: 'Space',
      duration: '6 Months',
      department: 'Computer Science',
      requirements: [],
      description: 'desc',
    });
    await expect(job.validate()).rejects.toMatchObject({
      errors: { type: expect.anything() },
    });
  });

  it('rejects an invalid applicationMethod', async () => {
    const job = new Job({
      employerId,
      title: 'Intern',
      location: 'Lagos',
      type: 'On-site',
      duration: '6 Months',
      department: 'Computer Science',
      requirements: [],
      description: 'desc',
      applicationMethod: 'carrier-pigeon',
    });
    await expect(job.validate()).rejects.toMatchObject({
      errors: { applicationMethod: expect.anything() },
    });
  });
});
