'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import SlidingTabs from '@/components/SlidingTabs';
import TiltCard from '@/components/TiltCard';

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 64 64" aria-hidden>
      <circle cx="22" cy="42" r="10" className="fill-primary-500 dark:fill-primary-400" />
      <circle cx="42" cy="22" r="10" className="fill-primary-500 dark:fill-primary-400" opacity="0.4" />
      <path d="M28 36 L38 28" className="stroke-primary-500 dark:stroke-primary-400" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

const OAUTH_ERRORS: Record<string, string> = {
  OAuthSignin: 'Could not start Google sign-in. Please try again.',
  OAuthCallback: 'Google sign-in was interrupted before it could finish. Please try again.',
  OAuthCreateAccount: 'Could not create an account with that Google profile.',
  Callback: 'Something went wrong completing sign-in. Please try again.',
  OAuthAccountNotLinked: 'That email already has a password-based account. Log in with your password instead.',
  AccessDenied: 'Google denied access to this app. If this app is still in testing, ask the developer to add your Google account as a test user.',
  Configuration: 'Google sign-in isn\'t configured correctly on the server.',
  Default: 'Google sign-in failed. Please try again.',
};

function OAuthErrorBanner() {
  const params = useSearchParams();
  const error = params.get('error');
  if (!error) return null;
  return (
    <div className="mb-4 p-3 rounded-xl bg-error-bg border border-error/20 text-error text-[13px] font-medium text-center">
      {OAUTH_ERRORS[error] || OAUTH_ERRORS.Default}
    </div>
  );
}

const HERO_COPY = {
  student: {
    quote: 'Everything I need for my SIWES search, in one clean dashboard.',
    attribution: 'Amara O. — Computer Science, University of Lagos',
    statLabel: 'This week',
    statValue: '126',
    statCaption: 'new verified opportunities',
    emailPlaceholder: 'you@university.edu.ng',
  },
  company: {
    quote: 'We hired four strong interns in a week — all pre-verified.',
    attribution: 'Ifeoma N. — HR Lead, Interswitch',
    statLabel: 'Platform-wide',
    statValue: '184',
    statCaption: 'verified companies hiring now',
    emailPlaceholder: 'you@company.com',
  },
  school: {
    quote: "We finally see every student's placement and logbook at a glance.",
    attribution: 'Dr. Adebayo K. — SIWES Coordinator',
    statLabel: 'Platform-wide',
    statValue: '92',
    statCaption: 'institutions tracking placements',
    emailPlaceholder: 'siwes@unilag.edu.ng',
  },
} as const;

function ResetSuccessBanner() {
  const params = useSearchParams();
  if (params.get('reset') !== 'success') return null;
  return (
    <div className="mb-4 p-3 rounded-xl bg-success-bg border border-success/20 text-success text-[13px] font-medium text-center">
      Password reset. Log in with your new password.
    </div>
  );
}

export default function Login() {
  const router = useRouter();

  const [tab, setTab] = useState<'student' | 'company' | 'school'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await signIn('credentials', { email, password, redirect: false });
      if (res?.error) throw new Error(res.error);
      router.push('/login-redirect');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log in');
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      await signIn('google', { callbackUrl: '/login-redirect' });
    } catch (err) {
      console.error('Google sign in failed', err);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="h-screen grid [grid-template-columns:repeat(auto-fit,minmax(360px,1fr))] bg-background text-foreground overflow-hidden">
      {/* LEFT: form */}
      <div className="h-full overflow-y-auto flex flex-col justify-center px-8 sm:px-14 lg:px-16 py-6 max-w-[440px] mx-auto w-full">
        <div className="sticky top-0 z-10 bg-background flex items-center justify-between pb-5 -mt-6 pt-6">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <span className="font-display font-extrabold text-[16px] tracking-tight">SIWES Finder</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="animate-fade-in-up stagger-1">
          <h1 className="font-display font-extrabold text-[26px] tracking-[-0.02em] mb-1">Welcome back</h1>
          <p className="text-[13.5px] text-muted mb-5">Log in to continue your placement journey.</p>
        </div>

        <div className="mb-5 animate-fade-in-up stagger-2">
          <SlidingTabs
            tabs={[
              { key: 'student', label: 'Student' },
              { key: 'company', label: 'Company' },
              { key: 'school', label: 'School' },
            ] as const}
            active={tab}
            onChange={setTab}
          />
        </div>

        <Suspense fallback={null}>
          <OAuthErrorBanner />
          <ResetSuccessBanner />
        </Suspense>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-error-bg border border-error/20 text-error text-[13px] font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleCredentialsLogin} className="space-y-3.5" autoComplete="off">
          {/* Honeypot fields: Chrome/Edge autofill targets the first email/password-typed
              inputs it finds in the DOM. These decoys sit before the real fields so autofill
              latches onto them instead of silently repopulating the visible form with a
              previously saved account's credentials. They're invisible and excluded from tab
              order/screen readers, but still real, visible-to-the-browser <input> elements --
              unlike a readOnly-until-focus trick, which also works for this but breaks the
              on-screen keyboard on mobile (readonly inputs never trigger it, and flipping
              readOnly off in a React onFocus handler fires too late for iOS/Android to notice). */}
          <div className="absolute w-px h-px overflow-hidden opacity-0 -z-10" aria-hidden="true">
            <input type="email" name="email" autoComplete="username" tabIndex={-1} />
            <input type="password" name="password" autoComplete="current-password" tabIndex={-1} />
          </div>

          <div className="animate-fade-in-up stagger-3">
            <label className="block text-[12.5px] font-semibold mb-1">Email address</label>
            <input
              type="email"
              required
              name="login-email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={HERO_COPY[tab].emailPlaceholder}
              className="w-full px-3.5 py-2.5 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-foreground text-[16px] focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 transition-all"
            />
          </div>

          <div className="animate-fade-in-up stagger-4">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[12.5px] font-semibold">Password</label>
              <Link href="/forgot-password" className="text-[12.5px] font-semibold text-primary-500 dark:text-primary-400">Forgot password?</Link>
            </div>
            <input
              type="password"
              required
              name="login-password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-foreground text-[16px] focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full py-2.5 rounded-lg bg-primary-500 dark:bg-primary-400 text-white font-bold text-[14.5px] shadow-lg shadow-primary-900/20 hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center animate-fade-in-up stagger-5"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Log in'}
          </button>
        </form>

        <div className="mt-4 relative animate-fade-in-up stagger-6">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-surface-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-background text-muted font-medium">or continue with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loading || googleLoading}
          className="w-full mt-4 py-2.5 rounded-lg border-[1.5px] border-surface-border bg-surface-1 font-semibold hover:bg-surface-2 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm animate-fade-in-up stagger-7"
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

        <div className="text-center text-[13px] text-muted mt-4 animate-fade-in-up stagger-8">
          Don&apos;t have an account? <Link href="/signup" className="font-bold text-primary-500 dark:text-primary-400">Sign up</Link>
        </div>
      </div>

      {/* RIGHT: animated visual — slides in on load, flips its copy when the
          role tab changes, and tilts gently toward the cursor. */}
      <div className="relative overflow-hidden hidden sm:block bg-gradient-to-br from-primary-500 to-[#17307A] dark:from-primary-500 dark:via-secondary-600 dark:to-secondary-900 animate-slide-in-right">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.14), transparent 50%)' }} />
        <div className="pointer-events-none absolute -top-24 -right-16 w-[320px] h-[320px] rounded-full blur-2xl animate-blob" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.22), transparent 70%)' }} />
        <div className="pointer-events-none absolute bottom-0 -left-20 w-[280px] h-[280px] rounded-full blur-2xl animate-blob [animation-direction:reverse]" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.16), transparent 70%)' }} />

        <div className="relative h-full flex flex-col justify-center px-10 lg:px-14 py-10 text-white">
          <div key={tab} className="animate-flip-in">
            <div className="font-display font-extrabold text-[26px] leading-[1.25] tracking-[-0.02em] max-w-[380px] mb-5">
              &ldquo;{HERO_COPY[tab].quote}&rdquo;
            </div>
            <div className="text-sm text-white/70">{HERO_COPY[tab].attribution}</div>
          </div>

          <TiltCard className="mt-10 max-w-[270px]">
            <div key={tab} className="bg-white/[0.1] border border-white/[0.18] rounded-2xl p-5 backdrop-blur-md animate-flip-in">
              <div className="text-xs text-white/70 mb-2">{HERO_COPY[tab].statLabel}</div>
              <div className="flex justify-between items-center gap-3">
                <div className="font-display font-extrabold text-[24px]">{HERO_COPY[tab].statValue}</div>
                <div className="text-[12px] text-white/70 text-right max-w-[140px]">{HERO_COPY[tab].statCaption}</div>
              </div>
            </div>
          </TiltCard>
        </div>
      </div>
    </div>
  );
}
