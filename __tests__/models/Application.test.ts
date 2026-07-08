// @vitest-environment node
import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import Application from '@/models/Application';

describe('Application model', () => {
  it('requires job, student, and employer', async () => {
    const application = new Application({});
    await expect(application.validate()).rejects.toMatchObject({
      errors: {
        job: expect.anything(),
        student: expect.anything(),
        employer: expect.anything(),
      },
    });
  });

  it('defaults status to Pending', async () => {
    const application = new Application({
      job: new mongoose.Types.ObjectId(),
      student: new mongoose.Types.ObjectId(),
      employer: new mongoose.Types.ObjectId(),
    });
    expect(application.status).toBe('Pending');
    await expect(application.validate()).resolves.toBeUndefined();
  });

  it('rejects an invalid status', async () => {
    const application = new Application({
      job: new mongoose.Types.ObjectId(),
      student: new mongoose.Types.ObjectId(),
      employer: new mongoose.Types.ObjectId(),
      status: 'Withdrawn',
    });
    await expect(application.validate()).rejects.toMatchObject({
      errors: { status: expect.anything() },
    });
  });

  it('declares a unique compound index on job + student', () => {
    const index = Application.schema
      .indexes()
      .find(([fields]: [Record<string, number>, unknown]) => fields.job === 1 && fields.student === 1);
    expect(index).toBeDefined();
    expect(index?.[1]).toMatchObject({ unique: true });
  });
});
