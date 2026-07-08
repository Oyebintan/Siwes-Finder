import '@testing-library/jest-dom/vitest';

// Route handlers import `@/lib/auth` and `@/lib/mongodb`, both of which throw
// at module-load time if these env vars are missing. Individual tests mock
// out the actual DB/auth calls, so these just need to be present.
process.env.NEXTAUTH_SECRET ||= 'test-secret-do-not-use-in-production';
process.env.MONGODB_URI ||= 'mongodb://localhost:27017/test';
