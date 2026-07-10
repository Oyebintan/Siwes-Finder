// @vitest-environment node
import { describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import '@/lib/mongodb';

// Regression guard: a page/route that imports Job but not User, then calls
// .populate('employerId', ...) (a User ref), throws Mongoose's
// MissingSchemaError on any process where User was never imported --
// e.g. a cold-start serverless function for a route that only imports Job.
// That error was getting swallowed by a broad try/catch and surfacing as a
// wrong 404 on every job details page. connectToDatabase() now imports
// every model as a side effect specifically to prevent this; this test
// asserts that side effect actually happens.
describe('connectToDatabase model registration', () => {
  it('registers every model schema as a side effect of importing @/lib/mongodb', () => {
    expect(mongoose.models.User).toBeTruthy();
    expect(mongoose.models.Job).toBeTruthy();
    expect(mongoose.models.Application).toBeTruthy();
    expect(mongoose.models.Logbook).toBeTruthy();
  });
});
