'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function ForgotPassword() {
  const router = useRouter();

  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      setInfo(data.message || 'If an account exists for that email, a reset code has been sent.');
      setStep('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Something went wrong.');
      router.push('/login?reset=success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-6 py-10">
      <div className="w-full max-w-[400px]">
        <div className="flex items-center justify-between mb-6">
          <Link href="/login" className="text-[13.5px] font-semibold text-muted">← Back to login</Link>
          <ThemeToggle />
        </div>

        <h1 className="font-display font-extrabold text-[24px] tracking-[-0.02em] mb-1">
          {step === 'email' ? 'Reset your password' : 'Enter your code'}
        </h1>
        <p className="text-[13.5px] text-muted mb-6">
          {step === 'email'
            ? "Enter the email on your account and we'll send you a verification code."
            : `We sent a 6-digit code to ${email}. Enter it below along with your new password.`}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-error-bg border border-error/20 text-error text-[13px] font-medium text-center">
            {error}
          </div>
        )}
        {info && step === 'reset' && (
          <div className="mb-4 p-3 rounded-xl bg-success-bg border border-success/20 text-success text-[13px] font-medium text-center">
            {info}
          </div>
        )}

        {step === 'email' ? (
          <form onSubmit={handleRequestCode} className="space-y-3.5">
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
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary-500 dark:bg-primary-400 text-white font-bold text-[14.5px] shadow-lg shadow-primary-900/20 hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-3.5">
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
            <div>
              <label className="block text-[12.5px] font-semibold mb-1">New password</label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-foreground text-[16px] focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 transition-all"
              />
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold mb-1">Confirm new password</label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-foreground text-[16px] focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary-500 dark:bg-primary-400 text-white font-bold text-[14.5px] shadow-lg shadow-primary-900/20 hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset password'}
            </button>
            <button
              type="button"
              onClick={() => { setStep('email'); setOtp(''); setError(''); setInfo(''); }}
              className="w-full text-[12.5px] font-semibold text-muted"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
