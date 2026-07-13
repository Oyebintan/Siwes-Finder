'use client';

import Link from 'next/link';
import { MailWarning, X } from 'lucide-react';
import { useState } from 'react';

interface EmailVerificationBannerProps {
  email: string;
  role: 'student' | 'employer' | 'school';
}

const COPY: Record<EmailVerificationBannerProps['role'], string> = {
  student: 'Verify your email to apply to placements.',
  employer: 'Verify your email to post opportunities.',
  school: 'Verify your email address.',
};

// Nudges toward /verify-email without blocking the dashboard -- applying
// to placements (students) and posting opportunities (employers) are
// gated server-side (see POST /api/applications, POST /api/jobs); this
// banner is the visible explanation for why those actions might get
// rejected. Dismissible for the tab session so it doesn't nag on every
// click, but reappears on the next full page load until the account is
// actually verified.
export function EmailVerificationBanner({ email, role }: EmailVerificationBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-xl bg-warning-bg border border-warning/20 text-[13px]">
      <MailWarning className="w-4 h-4 text-warning shrink-0" />
      <p className="flex-1 font-medium text-warning">{COPY[role]}</p>
      <Link
        href={`/verify-email?email=${encodeURIComponent(email)}`}
        className="font-bold text-warning underline underline-offset-2 shrink-0"
      >
        Verify now
      </Link>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="text-warning/70 hover:text-warning shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
