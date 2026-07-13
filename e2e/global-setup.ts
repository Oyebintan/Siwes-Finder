import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../src/models/User';
import Job from '../src/models/Job';
import Application from '../src/models/Application';

// Everything this suite creates is tagged with this prefix so it's easy to
// find and safe to wipe without touching real data in the same database.
export const E2E_TAG = 'e2e-siwes-finder';
export const SEEDED_EMPLOYER_EMAIL = `${E2E_TAG}-employer@example.com`;
export const SEEDED_EMPLOYER_PASSWORD = 'e2e-test-password-1';
export const SEEDED_ADMIN_EMAIL = `${E2E_TAG}-admin@example.com`;
export const SEEDED_ADMIN_PASSWORD = 'e2e-test-password-2';
export const SEEDED_JOB_TITLE = `${E2E_TAG} Frontend Intern`;

async function wipeE2eFixtures() {
  const staleUsers = await User.find({ email: { $regex: `^${E2E_TAG}` } }).select('_id');
  const staleIds = staleUsers.map((u) => u._id);
  await Application.deleteMany({ $or: [{ student: { $in: staleIds } }, { employer: { $in: staleIds } }] });
  await Job.deleteMany({ employerId: { $in: staleIds } });
  await User.deleteMany({ email: { $regex: `^${E2E_TAG}` } });
}

export default async function globalSetup() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI must be set to run the E2E suite.');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  await wipeE2eFixtures();

  const employer = await User.create({
    name: 'E2E Test Company',
    email: SEEDED_EMPLOYER_EMAIL,
    password: await bcrypt.hash(SEEDED_EMPLOYER_PASSWORD, 10),
    role: 'employer',
    companyName: 'E2E Test Company Ltd',
    verificationStatus: 'approved',
    emailVerified: true,
  });

  await User.create({
    name: 'E2E Test Admin',
    email: SEEDED_ADMIN_EMAIL,
    password: await bcrypt.hash(SEEDED_ADMIN_PASSWORD, 10),
    role: 'admin',
  });

  await Job.create({
    employerId: employer._id,
    title: SEEDED_JOB_TITLE,
    location: 'Lagos',
    type: 'Remote',
    duration: '6 Months',
    requirements: ['React'],
    description: 'Seeded fixture job for the Playwright golden-path suite.',
    isActive: true,
    applicationMethod: 'platform',
  });

  await mongoose.disconnect();
}

export async function globalTeardown() {
  if (!process.env.MONGODB_URI) return;
  await mongoose.connect(process.env.MONGODB_URI);
  await wipeE2eFixtures();
  await mongoose.disconnect();
}
