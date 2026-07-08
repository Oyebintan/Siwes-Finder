// @vitest-environment node
import mongoose from 'mongoose';
import { describe, expect, it } from 'vitest';
import Logbook from '@/models/Logbook';

describe('Logbook model', () => {
  it('requires studentId, employerId, weekNumber, dayOfWeek, and activityDescription', async () => {
    const entry = new Logbook({});
    await expect(entry.validate()).rejects.toMatchObject({
      errors: {
        studentId: expect.anything(),
        employerId: expect.anything(),
        weekNumber: expect.anything(),
        dayOfWeek: expect.anything(),
        activityDescription: expect.anything(),
      },
    });
  });

  it('defaults hoursWorked to 8 and isApproved to false', async () => {
    const entry = new Logbook({
      studentId: new mongoose.Types.ObjectId(),
      employerId: new mongoose.Types.ObjectId(),
      weekNumber: 1,
      dayOfWeek: 'Monday',
      activityDescription: 'Set up the dev environment.',
    });
    expect(entry.hoursWorked).toBe(8);
    expect(entry.isApproved).toBe(false);
    await expect(entry.validate()).resolves.toBeUndefined();
  });
});
