import { NextResponse } from 'next/server';

// Deployment fingerprint: answers "which commit is actually live?" without
// guessing from UI behavior. Vercel injects the VERCEL_GIT_* vars at build
// time; locally they're absent and this reports "dev".
export async function GET() {
  return NextResponse.json({
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
    branch: process.env.VERCEL_GIT_COMMIT_REF || 'local',
    message: process.env.VERCEL_GIT_COMMIT_MESSAGE || null,
    deployedEnv: process.env.VERCEL_ENV || 'development',
  });
}
