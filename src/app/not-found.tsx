import Link from 'next/link';

// Branded 404 -- without this file, Next serves its unstyled default page,
// which reads as broken to anyone following a stale job link.
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-6 text-center">
      <p className="font-display font-extrabold text-[64px] leading-none tracking-[-0.04em] text-primary-500 dark:text-primary-400">
        404
      </p>
      <h1 className="font-display font-extrabold text-[22px] tracking-[-0.02em] mt-4 mb-2">
        This page doesn&apos;t exist
      </h1>
      <p className="text-[13.5px] text-muted max-w-[340px] mb-6">
        The link may be outdated, or the opportunity you&apos;re looking for may have closed.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="px-5 py-2.5 rounded-lg bg-primary-500 dark:bg-primary-400 text-white font-bold text-[13.5px] shadow-lg shadow-primary-900/20 hover:brightness-110 transition-all"
        >
          Go home
        </Link>
        <Link
          href="/login"
          className="px-5 py-2.5 rounded-lg border-[1.5px] border-surface-border bg-surface-1 font-semibold text-[13.5px] hover:bg-surface-2 transition-all"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}
