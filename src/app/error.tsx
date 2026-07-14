'use client';

import { useEffect } from 'react';

// App-level error boundary: an unhandled render/data error shows this
// branded recovery screen instead of a blank page or raw stack. Must be a
// client component -- reset() re-renders the failed segment in place.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error boundary:', error);
    // Ship the crash to the server (fire-and-forget) so client-only render
    // errors show up in the Vercel Logs dashboard -- without this they die
    // silently in the user's browser console.
    fetch('/api/client-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        digest: error.digest,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      }),
      keepalive: true,
    }).catch(() => {});
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-6 text-center">
      <h1 className="font-display font-extrabold text-[22px] tracking-[-0.02em] mb-2">
        Something went wrong
      </h1>
      <p className="text-[13.5px] text-muted max-w-[340px] mb-6">
        An unexpected error occurred. Your data is safe — try again, and if it keeps happening,
        reload the page.
      </p>
      <button
        onClick={reset}
        className="px-5 py-2.5 rounded-lg bg-primary-500 dark:bg-primary-400 text-white font-bold text-[13.5px] shadow-lg shadow-primary-900/20 hover:brightness-110 transition-all"
      >
        Try again
      </button>
    </div>
  );
}
