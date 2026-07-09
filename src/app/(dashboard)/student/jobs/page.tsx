'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Bookmark, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';

type Job = {
  _id: string;
  title: string;
  location: string;
  type: string;
  duration: string;
  requirements?: string[];
  employerId?: { name?: string; companyName?: string; industry?: string };
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
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);

  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(query); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), sort });
    if (debouncedQ) params.set('q', debouncedQ);
    if (type !== 'All') params.set('type', type);

    fetch(`/api/jobs?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setJobs(data.jobs || []);
        setTotalPages(data.totalPages || 1);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [debouncedQ, type, sort, page]);

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
          onChange={(e) => setSort(e.target.value as 'newest' | 'oldest')}
          className="border-[1.5px] border-surface-border rounded-[10px] px-4 text-[16px] font-semibold bg-surface-1 text-foreground"
        >
          <option value="newest">Sort: Newest</option>
          <option value="oldest">Sort: Oldest</option>
        </select>
      </div>

      <div className="flex gap-2 flex-wrap overflow-x-auto">
        {TYPE_CHIPS.map((t) => (
          <button
            key={t}
            onClick={() => { setType(t); setPage(1); }}
            className={`px-4 py-2 rounded-full text-[13px] font-bold whitespace-nowrap transition-colors ${
              type === t ? 'bg-primary-500 dark:bg-primary-400 text-white' : 'bg-surface-1 border-[1.5px] border-surface-border text-foreground'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
      ) : jobs.length === 0 ? (
        <div className="bg-surface-1 border border-surface-border rounded-[14px] p-14 text-center text-sm text-muted">No matching opportunities. Try adjusting your search or filters.</div>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {jobs.map((job, i) => (
            <Link
              key={job._id}
              href={`/student/jobs/${job._id}`}
              className="bg-surface-1 rounded-[14px] p-5 border border-surface-border hover:border-primary-500 transition-colors"
            >
              <div className="flex items-center gap-2.5 mb-3.5">
                <div className={`w-[38px] h-[38px] rounded-[9px] flex items-center justify-center font-display font-extrabold text-[12.5px] shrink-0 ${TINTS[i % TINTS.length]}`}>
                  {initials(job.employerId?.companyName || job.employerId?.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-bold text-[15px] truncate">{job.title}</div>
                  <div className="text-xs text-muted truncate">{job.employerId?.companyName || job.employerId?.name} · {job.location}</div>
                </div>
                <Bookmark className="w-[18px] h-[18px] text-muted shrink-0" />
              </div>
              <div className="flex gap-2 flex-wrap mb-3.5">
                {(job.requirements || []).slice(0, 1).map((r) => (
                  <span key={r} className="text-[11.5px] px-2.5 py-1 rounded-full bg-background text-muted">{r}</span>
                ))}
                <span className="text-[11.5px] px-2.5 py-1 rounded-full bg-background text-muted">{job.duration}</span>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-success-bg text-success">● Verified</span>
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
