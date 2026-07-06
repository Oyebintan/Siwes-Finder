'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function Onboarding() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // If they already have a role, bounce them out
    if (status === 'authenticated' && session.user.role !== 'unassigned') {
      router.push(session.user.role === 'student' ? '/student/dashboard' : '/employer/dashboard');
    }
  }, [session, status, router]);

  const handleRoleSelect = async (role: 'student' | 'employer') => {
    setLoading(true);
    setError('');
    try {
      // 1. Call API to update the role in MongoDB
      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role })
      });

      if (!res.ok) throw new Error('Failed to assign role');

      // 2. Trigger NextAuth to update the session locally
      await update({ role });

      // 3. Redirect
      router.push(role === 'student' ? '/student/dashboard' : '/employer/dashboard');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="w-full max-w-lg p-8 rounded-[2rem] bg-white/5 dark:bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl relative z-10 text-center">
        <h2 className="text-3xl font-extrabold tracking-tight mb-2">Welcome to SIWES Finder!</h2>
        <p className="text-foreground/60 mb-8">You logged in with Google. Before we continue, please tell us how you'll be using the platform.</p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => handleRoleSelect('student')}
            className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500 hover:bg-blue-500/10 transition-all flex flex-col items-center gap-3"
          >
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-xl">S</div>
            <div>
              <h3 className="font-bold text-lg">I'm a Student</h3>
              <p className="text-xs text-foreground/60">I want to find and apply for IT placements.</p>
            </div>
          </button>

          <button
            onClick={() => handleRoleSelect('employer')}
            className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-cyan-500 hover:bg-cyan-500/10 transition-all flex flex-col items-center gap-3"
          >
            <div className="w-12 h-12 rounded-full bg-cyan-500 flex items-center justify-center text-white font-bold text-xl">E</div>
            <div>
              <h3 className="font-bold text-lg">I'm an Employer</h3>
              <p className="text-xs text-foreground/60">I want to post jobs and review applicants.</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
