'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'code' | 'done'>('code');
  // Where "Continue" goes on success -- set by signup right after
  // register+auto-login, before the app is entered for the first time.
  // Reached from elsewhere (e.g. the dashboard banner) without this param,
  // login-redirect is a safe default: it re-derives the right dashboard
  // from the now-verified session. Only a same-site path is accepted --
  // this is a URL query param a caller controls, so an absolute or
  // protocol-relative ("//evil.com") value must never be followed.
  const rawNext = searchParams.get('next');
  const next = rawNext && /^\/(?!\/)/.test(rawNext) ? rawNext : '/login-redirect';

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setInfo('');
    setResending(true);
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setInfo(data.message || 'If an unverified account exists for that email, a verification code has been sent.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-6 py-10">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-[13.5px] font-semibold text-muted"
          >
            Sign out
          </button>
          <ThemeToggle />
        </div>

        <h1 className="font-display font-extrabold text-[24px] tracking-[-0.02em] mb-1">
          {step === 'code' ? 'Verify your email' : "You're verified"}
        </h1>
        <p className="text-[13.5px] text-muted mb-6">
          {step === 'code'
            ? 'Enter the 6-digit code we emailed you when you signed up. It expires 10 minutes after being sent.'
            : 'Your email address is confirmed.'}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-error-bg border border-error/20 text-error text-[13px] font-medium text-center">
            {error}
          </div>
        )}
        {info && (
          <div className="mb-4 p-3 rounded-xl bg-success-bg border border-success/20 text-success text-[13px] font-medium text-center">
            {info}
          </div>
        )}

        {step === 'code' ? (
          <form onSubmit={handleVerify} className="space-y-3.5">
            <div>
              <label className="block text-[12.5px] font-semibold mb-1">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-foreground text-[16px] focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold mb-1">Verification code</label>
              <input
                type="text"
                inputMode="numeric"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full px-3.5 py-2.5 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-foreground text-[16px] tracking-[0.3em] text-center focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary-500 dark:bg-primary-400 text-white font-bold text-[14.5px] shadow-lg shadow-primary-900/20 hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify email'}
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || !email}
              className="w-full text-[12.5px] font-semibold text-muted disabled:opacity-50"
            >
              {resending ? 'Sending…' : "Didn't get a code? Resend"}
            </button>
          </form>
        ) : (
          <button
            onClick={() => router.push(next)}
            className="w-full py-2.5 rounded-lg bg-primary-500 dark:bg-primary-400 text-white font-bold text-[14.5px] shadow-lg shadow-primary-900/20 hover:brightness-110 transition-all"
          >
            Continue
          </button>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmail() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailForm />
    </Suspense>
  );
}
