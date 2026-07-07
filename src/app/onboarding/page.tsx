'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Loader2, GraduationCap, Building2 } from 'lucide-react';

export default function Onboarding() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleSelection = async (role: 'student' | 'employer') => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error('Failed to update role');
      await update({ role });
      router.push(role === 'student' ? '/student/dashboard' : '/employer/dashboard');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-2xl animate-fade-in-up">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4">Welcome to SIWES Finder</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg">We noticed you signed in with Google. How will you be using this platform?</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-800/40 text-red-600 dark:text-red-400 text-center">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button onClick={() => handleRoleSelection('student')} disabled={loading}
            className="group relative p-8 rounded-3xl bg-surface-1 border border-surface-border hover:border-accent-400 hover:shadow-md transition-all text-left disabled:opacity-50">
            <div className="w-16 h-16 rounded-2xl bg-accent-50 dark:bg-accent-500/10 text-accent-600 dark:text-accent-300 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <GraduationCap className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">I am a Student</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">I am looking for an IT/SIWES placement at an organization, and I want to upload my resume.</p>
            {loading && <Loader2 className="absolute top-8 right-8 w-6 h-6 animate-spin text-accent-500" />}
          </button>

          <button onClick={() => handleRoleSelection('employer')} disabled={loading}
            className="group relative p-8 rounded-3xl bg-surface-1 border border-surface-border hover:border-accent-400 hover:shadow-md transition-all text-left disabled:opacity-50">
            <div className="w-16 h-16 rounded-2xl bg-accent-50 dark:bg-accent-500/10 text-accent-600 dark:text-accent-300 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Building2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">I am an Employer</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">I represent an organization and want to post IT openings to recruit talented students.</p>
            {loading && <Loader2 className="absolute top-8 right-8 w-6 h-6 animate-spin text-accent-500" />}
          </button>
        </div>
      </div>
    </div>
  );
}
