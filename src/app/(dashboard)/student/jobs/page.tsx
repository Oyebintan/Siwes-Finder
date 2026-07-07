'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { MapPin, Briefcase, Clock, Building2, Search, Loader2 } from 'lucide-react';

type Job = {
  _id: string;
  title: string;
  location: string;
  type: string;
  duration: string;
  description: string;
  stipend?: string;
  employerId?: { name?: string; companyName?: string; industry?: string };
};

const TYPES = ['All', 'On-site', 'Remote', 'Hybrid'] as const;

export default function StudentJobBoard() {
  const [query, setQuery] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [type, setType] = useState<(typeof TYPES)[number]>('All');
  const [page, setPage] = useState(1);

  // Debounced copies of the free-text inputs so we don't fetch on every keystroke.
  const [debouncedQ, setDebouncedQ] = useState('');
  const [debouncedLoc, setDebouncedLoc] = useState('');

  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(query); setDebouncedLoc(locationInput); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [query, locationInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (debouncedQ) params.set('q', debouncedQ);
    if (debouncedLoc) params.set('location', debouncedLoc);
    if (type !== 'All') params.set('type', type);

    fetch(`/api/jobs?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setJobs(data.jobs || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [debouncedQ, debouncedLoc, type, page]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Job Board</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Discover and apply for SIWES placements from verified companies.</p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search roles..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-surface-2 border border-gray-200 dark:border-surface-border focus:border-accent-400 focus:ring-1 focus:ring-accent-400 text-gray-900 dark:text-white outline-none transition-all text-sm"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="flex flex-wrap gap-2">
          {TYPES.map((t) => (
            <button
              key={t}
              onClick={() => { setType(t); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${type === t ? 'bg-gradient-to-r from-accent-700 to-accent-400 text-white shadow' : 'bg-surface-1 border border-surface-border text-gray-500 dark:text-gray-400 hover:border-accent-400/40'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="relative sm:w-56">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            placeholder="Filter by location..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-gray-50 dark:bg-surface-2 border border-gray-200 dark:border-surface-border focus:border-accent-400 focus:ring-1 focus:ring-accent-400 text-gray-900 dark:text-white outline-none transition-all text-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-accent-500" /></div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20 bg-surface-1 border border-surface-border rounded-3xl shadow-sm">
          <Building2 className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">No matching placements</h3>
          <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 dark:text-gray-400">{total} placement{total === 1 ? '' : 's'} found</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {jobs.map((job) => (
              <div key={job._id} className="group bg-surface-1 border border-surface-border hover:border-accent-400/40 shadow-sm rounded-2xl p-6 transition-all hover:shadow-md dark:hover:shadow-[0_0_24px_-10px_rgba(52,211,153,0.4)]">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-accent-600 dark:group-hover:text-accent-300 transition-colors">{job.title}</h3>
                    {(job.employerId?.companyName || job.employerId?.name) && (
                      <p className="text-sm font-semibold text-accent-700 dark:text-accent-300 mt-0.5">{job.employerId?.companyName || job.employerId?.name}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {job.location}</span>
                      <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {job.type}</span>
                      <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {job.duration}</span>
                    </div>
                  </div>
                  <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 rounded-full text-xs font-bold shrink-0">
                    Active
                  </div>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2 mb-6">{job.description}</p>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-surface-border">
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {job.stipend && job.stipend !== 'Unpaid' ? job.stipend : <span className="text-gray-400 dark:text-gray-500 font-normal">Unpaid</span>}
                  </span>
                  <Link
                    href={`/student/jobs/${job._id}`}
                    className="px-5 py-2 rounded-xl bg-gray-50 dark:bg-surface-2 hover:bg-gradient-to-r hover:from-accent-700 hover:to-accent-400 hover:text-white text-gray-700 dark:text-gray-200 text-sm font-bold transition-all"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-2">
              <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="px-4 py-2 rounded-xl bg-surface-1 border border-surface-border font-bold text-sm disabled:opacity-40 hover:border-accent-400/40 transition-all">Previous</button>
              <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className="px-4 py-2 rounded-xl bg-surface-1 border border-surface-border font-bold text-sm disabled:opacity-40 hover:border-accent-400/40 transition-all">Next</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
