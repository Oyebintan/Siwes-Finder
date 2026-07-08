'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 64 64" aria-hidden>
      <circle cx="22" cy="42" r="10" className="fill-primary-500 dark:fill-primary-400" />
      <circle cx="42" cy="22" r="10" className="fill-primary-500 dark:fill-primary-400" opacity="0.4" />
      <path d="M28 36 L38 28" className="stroke-primary-500 dark:stroke-primary-400" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

const COPY = {
  student: {
    subtitle: 'Find and apply to verified SIWES opportunities.',
    heroQuote: 'Everything I need for my SIWES search, in one clean dashboard.',
    heroAttribution: 'Amara O. — Computer Science, University of Lagos',
    statLabel: 'This week',
    statValue: '126',
    statCaption: 'new verified opportunities',
  },
  employer: {
    subtitle: 'Get verified and reach ready, pre-screened students.',
    heroQuote: 'We hired four strong interns in a week — all pre-verified.',
    heroAttribution: 'Ifeoma N. — HR Lead, Interswitch',
    statLabel: 'Platform-wide',
    statValue: '184',
    statCaption: 'verified companies hiring now',
  },
} as const;

export default function Signup() {
  const router = useRouter();

  const [role, setRole] = useState<'student' | 'employer'>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const isStudent = role === 'student';
  const copy = COPY[role];

  const handleCredentialsSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Something went wrong on the server');
      }

      const signInRes = await signIn('credentials', { email, password, redirect: false });
      if (signInRes?.error) throw new Error(signInRes.error || 'Failed to auto-login. Please log in manually.');

      router.push(isStudent ? '/profile-setup' : '/login-redirect');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setGoogleLoading(true);
      await signIn('google', { callbackUrl: '/login-redirect' });
    } catch (err) {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid [grid-template-columns:repeat(auto-fit,minmax(360px,1fr))] bg-background text-foreground">
      {/* LEFT: form */}
      <div className="flex flex-col justify-center px-8 sm:px-16 py-16 max-w-[460px] mx-auto w-full">
        <div className="flex items-center justify-between mb-10">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo />
            <span className="font-display font-extrabold text-[17px] tracking-tight">SIWES Finder</span>
          </Link>
          <ThemeToggle />
        </div>

        <h1 className="font-display font-extrabold text-[28px] tracking-[-0.02em] mb-2">Create your account</h1>
        <p className="text-[14.5px] text-muted mb-8">{copy.subtitle}</p>

        <div className="flex gap-2 bg-background border border-surface-border rounded-[10px] p-1 mb-7">
          <button
            type="button"
            onClick={() => setRole('student')}
            className={`flex-1 text-center py-2.5 rounded-lg text-[13.5px] transition-colors ${isStudent ? 'bg-surface-1 font-bold shadow-sm' : 'font-semibold text-muted'}`}
          >
            Student
          </button>
          <button
            type="button"
            onClick={() => setRole('employer')}
            className={`flex-1 text-center py-2.5 rounded-lg text-[13.5px] transition-colors ${!isStudent ? 'bg-surface-1 font-bold shadow-sm' : 'font-semibold text-muted'}`}
          >
            Company
          </button>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-error-bg border border-error/20 text-error text-sm font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleCredentialsSignup} className="space-y-4">
          <div>
            <label className="block text-[13px] font-semibold mb-1.5">{isStudent ? 'Full name' : 'Company name'}</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isStudent ? 'Amara Okafor' : 'Paystack'}
              className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-foreground text-[14.5px] focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 transition-all"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-1.5">{isStudent ? 'School email' : 'Work email'}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isStudent ? 'you@university.edu.ng' : 'hr@company.com'}
              className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-foreground text-[14.5px] focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 transition-all"
            />
          </div>

          <div>
            <label className="block text-[13px] font-semibold mb-1.5">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a password"
              className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-foreground text-[14.5px] focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className={`w-full py-3.5 rounded-lg font-bold text-[15px] shadow-lg disabled:opacity-50 transition-all flex items-center justify-center ${
              isStudent
                ? 'bg-primary-500 dark:bg-primary-400 text-white shadow-primary-900/20 hover:brightness-110'
                : 'bg-accent-500 text-[#032E1A] shadow-accent-900/20 hover:brightness-105'
            }`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : isStudent ? 'Create student account' : 'Create company account'}
          </button>
        </form>

        <div className="mt-6 relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-surface-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-background text-muted font-medium">or continue with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={loading || googleLoading}
          className="w-full mt-6 py-3 rounded-lg border-[1.5px] border-surface-border bg-surface-1 font-semibold hover:bg-surface-2 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm"
        >
          {googleLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </>
          )}
        </button>

        <div className="text-center text-[13.5px] text-muted mt-6">
          Already have an account? <Link href="/login" className="font-bold text-primary-500 dark:text-primary-400">Log in</Link>
        </div>
      </div>

      {/* RIGHT: visual */}
      <div className="relative overflow-hidden min-h-[320px] bg-gradient-to-br from-primary-500 to-[#17307A] dark:from-primary-400 dark:to-[#4B3FD8]">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.12), transparent 50%)' }} />
        <div className="relative h-full flex flex-col justify-center px-10 sm:px-16 py-16 text-white">
          <div className="font-display font-extrabold text-[30px] leading-[1.25] tracking-[-0.02em] max-w-[400px] mb-6">
            &ldquo;{copy.heroQuote}&rdquo;
          </div>
          <div className="text-sm text-white/80">{copy.heroAttribution}</div>

          <div className="mt-14 bg-white/[0.08] border border-white/[0.15] rounded-2xl p-5 backdrop-blur-md max-w-[280px]">
            <div className="text-xs text-white/80 mb-2.5">{copy.statLabel}</div>
            <div className="flex justify-between items-center gap-3">
              <div className="font-display font-extrabold text-[26px]">{copy.statValue}</div>
              <div className="text-[12.5px] text-white/80 text-right max-w-[140px]">{copy.statCaption}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
