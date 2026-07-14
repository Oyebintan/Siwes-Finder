import User from '@/models/User';
import { escapeRegex } from './escapeRegex';

// Canonical form for storing and comparing email addresses. The User
// schema also applies lowercase+trim on save, so new documents are always
// stored in this form.
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Looks up a user by email, treating the address case-insensitively.
//
// Two steps because the database predates email normalization: accounts
// created before the schema gained lowercase+trim may be stored with
// capital letters ("Ada@Example.com"). The fast path hits the unique
// index with the normalized form; only when that misses do we fall back
// to an anchored case-insensitive scan so those legacy accounts can
// still sign in. The fallback pattern is fully escaped -- the email is
// user input.
export async function findUserByEmail(email: string) {
  const normalized = normalizeEmail(email);
  const user = await User.findOne({ email: normalized });
  if (user) return user;
  return User.findOne({ email: new RegExp(`^${escapeRegex(email.trim())}$`, 'i') });
}
