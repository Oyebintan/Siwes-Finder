'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Bookmark, ChevronLeft, ChevronRight } from 'lucide-react';

type Job = {
  _id: string;
  title: string;
  location: string;
  type: string;
  duration: string;
  requirements?: string[];
  employerId?: { name?: string; companyName?: string; industry?: string; avatarUrl?: string };
  matchScore?: number;
};

const TYPE_CHIPS = ['All', 'On-site', 'Remote', 'Hybrid'] as const;

function initials(name?: string) {
  if (!name) return '??';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

const TINTS = [
  'bg-primary-500/10 dark:bg-primary-400/15 text-primary-500 dark:text-primary-400',
  'bg-accent-500/10 text-accent-500',
  'bg-warning-bg text-warning',
  'bg-error-bg text-error',
];

export default function BrowseOpportunities() {
  const [query, setQuery] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [type, setType] = useState<(typeof TYPE_CHIPS)[number]>('All');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'match'>('newest');
  const [page, setPage] = useState(1);
  const [savedOnly, setSavedOnly] = useState(false);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(query); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/saved-jobs?ids=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && Array.isArray(data?.ids)) setSavedIds(new Set<string>(data.ids));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    // Saved view is a small, personal list — fetch it whole (no pagination).
    const url = savedOnly
      ? '/api/saved-jobs'
      : (() => {
          const params = new URLSearchParams({ page: String(page), sort });
          if (debouncedQ) params.set('q', debouncedQ);
          if (type !== 'All') params.set('type', type);
          return `/api/jobs?${params.toString()}`;
        })();

    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setJobs(data.jobs || []);
        setTotalPages(savedOnly ? 1 : data.totalPages || 1);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [debouncedQ, type, sort, page, savedOnly]);

  const toggleSave = async (jobId: string) => {
    try {
      const res = await fetch('/api/saved-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) return;
      const data = await res.json();
      setSavedIds((prev) => {
        const next = new Set(prev);
        if (data.saved) next.add(jobId);
        else next.delete(jobId);
        return next;
      });
      // In the saved view, unsaving removes the card from the list.
      if (savedOnly && !data.saved) {
        setJobs((prev) => prev.filter((j) => j._id !== jobId));
      }
    } catch {
      // Leave the current state; the user can retry.
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <h1 className="font-display font-extrabold text-[26px] tracking-[-0.02em]">Browse opportunities</h1>

      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[220px] flex items-center gap-2.5 bg-surface-1 border-[1.5px] border-surface-border rounded-[10px] px-4 py-3">
          <Search className="w-4 h-4 text-muted shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by role, company, or skill…"
            className="flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as 'newest' | 'oldest' | 'match')}
          className="border-[1.5px] border-surface-border rounded-[10px] px-4 text-[16px] font-semibold bg-surface-1 text-foreground"
        >
          <option value="newest">Sort: Newest</option>
          <option value="oldest">Sort: Oldest</option>
          <option value="match">Sort: Best match</option>
        </select>
      </div>

      <div className="flex gap-2 flex-wrap overflow-x-auto">
        {TYPE_CHIPS.map((t) => (
          <button
            key={t}
            onClick={() => { setType(t); setPage(1); setSavedOnly(false); }}
            className={`px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-colors ${
              !savedOnly && type === t ? 'bg-primary-500 dark:bg-primary-400 text-white' : 'bg-surface-1 border-[1.5px] border-surface-border text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
        <button
          onClick={() => { setSavedOnly((v) => !v); setPage(1); }}
          className={`px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            savedOnly ? 'bg-primary-500 dark:bg-primary-400 text-white' : 'bg-surface-1 border-[1.5px] border-surface-border text-foreground'
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${savedOnly ? 'fill-current' : ''}`} /> Saved
        </button>
      </div>

      {loading ? (
        // Skeleton cards shaped like the real listings, so the grid doesn't
        // collapse to a lone spinner and then jump when results land.
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="bg-surface-1 rounded-[14px] p-5 border border-surface-border">
              <div className="flex items-center gap-2.5 mb-3.5">
                <div className="w-[38px] h-[38px] rounded-[9px] skeleton shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="h-3.5 w-3/4 rounded skeleton" />
                  <div className="h-2.5 w-1/2 rounded skeleton" />
                </div>
              </div>
              <div className="flex gap-2 mb-3.5">
                <div className="h-6 w-16 rounded-full skeleton" />
                <div className="h-6 w-20 rounded-full skeleton" />
              </div>
              <div className="h-5 w-24 rounded-full skeleton" />
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-surface-1 border border-surface-border rounded-[14px] p-14 text-center text-sm text-muted">
          {savedOnly
            ? 'No saved opportunities yet. Tap the bookmark on any listing to save it for later.'
            : 'No matching opportunities. Try adjusting your search or filters.'}
        </div>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {jobs.map((job, i) => (
            <Link
              key={job._id}
              href={`/student/jobs/${job._id}`}
              className="bg-surface-1 rounded-[14px] p-5 border border-surface-border hover:border-primary-500 hover:-translate-y-0.5 hover:shadow-md transition-all animate-scale-in"
              style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
            >
              <div className="flex items-center gap-2.5 mb-3.5">
                {job.employerId?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={job.employerId.avatarUrl} alt="" className="w-[38px] h-[38px] rounded-[9px] object-cover shrink-0 bg-surface-2" />
                ) : (
                  <div className={`w-[38px] h-[38px] rounded-[9px] flex items-center justify-center font-display font-extrabold text-[12.5px] shrink-0 ${TINTS[i % TINTS.length]}`}>
                    {initials(job.employerId?.companyName || job.employerId?.name)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-[15px] truncate">{job.title}</div>
                  <div className="text-xs text-muted truncate">{job.employerId?.companyName || job.employerId?.name} · {job.location}</div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); toggleSave(job._id); }}
                  aria-pressed={savedIds.has(job._id)}
                  aria-label={savedIds.has(job._id) ? 'Remove from saved' : 'Save for later'}
                  className="shrink-0 p-1 -m-1 text-muted hover:text-primary-500 dark:hover:text-primary-400 transition-colors"
                >
                  <Bookmark className={`w-[18px] h-[18px] ${savedIds.has(job._id) ? 'fill-primary-500 text-primary-500 dark:fill-primary-400 dark:text-primary-400' : ''}`} />
                </button>
              </div>
              <div className="flex gap-2 flex-wrap mb-3.5">
                {(job.requirements || []).slice(0, 1).map((r) => (
                  <span key={r} className="text-[11.5px] px-2.5 py-1 rounded-full bg-background text-muted">{r}</span>
                ))}
                <span className="text-[11.5px] px-2.5 py-1 rounded-full bg-background text-muted">{job.duration}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-success-bg text-success">● Verified</span>
                {job.matchScore != null && (
                  <span className="font-mono text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary-500/10 dark:bg-primary-400/15 text-primary-500 dark:text-primary-400">
                    {job.matchScore}% match
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-4">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="w-[34px] h-[34px] rounded-lg border border-surface-border bg-surface-1 flex items-center justify-center text-muted disabled:opacity-40">
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map((n) => (
            <button
              key={n}
              onClick={() => setPage(n)}
              className={`w-[34px] h-[34px] rounded-lg text-[13px] font-bold ${n === page ? 'bg-primary-500 dark:bg-primary-400 text-white' : 'border border-surface-border bg-surface-1 text-foreground'}`}
            >
              {n}
            </button>
          ))}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="w-[34px] h-[34px] rounded-lg border border-surface-border bg-surface-1 flex items-center justify-center text-muted disabled:opacity-40">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
