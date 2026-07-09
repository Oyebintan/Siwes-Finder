'use client';

import { useEffect, useState } from 'react';
import { Bookmark, Loader2 } from 'lucide-react';

// Bookmark toggle for the job details page. Reads the current saved state on
// mount, then flips it via /api/saved-jobs on click.
export default function SaveJobButton({ jobId }: { jobId: string }) {
  const [saved, setSaved] = useState<boolean | null>(null);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/saved-jobs?ids=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setSaved(Array.isArray(data?.ids) ? data.ids.includes(jobId) : false);
      })
      .catch(() => { if (!cancelled) setSaved(false); });
    return () => { cancelled = true; };
  }, [jobId]);

  const toggle = async () => {
    if (toggling || saved === null) return;
    setToggling(true);
    try {
      const res = await fetch('/api/saved-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      if (res.ok) {
        const data = await res.json();
        setSaved(Boolean(data.saved));
      }
    } catch {
      // Leave the current state; the user can retry.
    } finally {
      setToggling(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={toggling || saved === null}
      aria-pressed={saved === true}
      className={`bg-surface-1 border-[1.5px] px-5 py-3 rounded-lg text-[14.5px] font-bold flex items-center gap-2 h-fit transition-colors disabled:opacity-60 ${
        saved
          ? 'border-primary-500 text-primary-500 dark:border-primary-400 dark:text-primary-400'
          : 'border-surface-border'
      }`}
    >
      {toggling ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
      )}
      {saved ? 'Saved' : 'Save'}
    </button>
  );
}
