#!/usr/bin/env node
// One-off utility to create (or promote) a super_admin account directly in
// MongoDB. Useful because there's no public admin signup and SUPER_ADMIN_EMAILS
// only promotes a user the next time they sign in -- this script gets a
// working login in place immediately, with a chosen password.
//
// Usage:
//   MONGODB_URI=... node scripts/create-super-admin.mjs <email> <password> [name]
//
// The password is never printed or committed -- pass it as a CLI arg or via
// the SUPER_ADMIN_PASSWORD env var, and set SUPER_ADMIN_EMAILS in your
// deployment env too so the role survives future sign-ins.

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const [, , emailArg, passwordArg, nameArg] = process.argv;

const email = (emailArg || process.env.SUPER_ADMIN_EMAIL || '').trim().toLowerCase();
const password = passwordArg || process.env.SUPER_ADMIN_PASSWORD;
const name = nameArg || process.env.SUPER_ADMIN_NAME || 'Super Admin';

if (!email || !password) {
  console.error('Usage: node scripts/create-super-admin.mjs <email> <password> [name]');
  process.exit(1);
}

if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI must be set in the environment.');
  process.exit(1);
}

// Minimal inline schema -- deliberately not importing the TS model, since
// this plain script runs outside the Next.js/TS build pipeline. `strict:
// false` lets it coexist safely with the full schema in src/models/User.ts.
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    role: {
      type: String,
      enum: ['student', 'employer', 'admin', 'super_admin', 'unassigned'],
      default: 'unassigned',
    },
  },
  { timestamps: true, strict: false }
);

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.findOneAndUpdate(
    { email },
    { $set: { password: hashedPassword, role: 'super_admin' }, $setOnInsert: { name, email } },
    { upsert: true, new: true }
  );

  console.log(`Super admin ready: ${user.email} (role=${user.role})`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
