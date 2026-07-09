'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Trash2, Briefcase, MapPin } from 'lucide-react';

type ModJob = {
  _id: string;
  title: string;
  location: string;
  type: string;
  isActive: boolean;
  applicationMethod: string;
  employerId?: { name?: string; companyName?: string; email?: string; verificationStatus?: string };
};

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<ModJob[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/jobs?page=${page}`);
      const data = await res.json();
      setJobs(data.jobs || []);
      setTotalPages(data.totalPages || 1);
    } finally {
      setLoading(false);
    }
  }, [page]);

  // `load` sets loading state before fetching; that's the intended fetch-on-mount/dependency-change pattern.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  async function remove(id: string, title: string) {
    if (!window.confirm(`Take down "${title}"? This deletes the listing and its applications.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/jobs/${id}`, { method: 'DELETE' });
      if (res.ok) await load();
      else alert((await res.json()).error || 'Could not delete listing.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="font-display font-extrabold text-[26px] tracking-[-0.02em]">Opportunity moderation</h1>
        <p className="text-sm text-muted mt-1">Review every posting on the platform and remove fraudulent ones.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
      ) : jobs.length === 0 ? (
        <div className="p-14 rounded-3xl bg-surface-1 border border-surface-border text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 dark:bg-primary-400/15 flex items-center justify-center mb-5">
            <Briefcase className="w-8 h-8 text-primary-500 dark:text-primary-400" />
          </div>
          <h4 className="font-display font-bold text-lg">No listings yet.</h4>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((j) => (
            <div key={j._id} className="p-6 rounded-2xl bg-surface-1 border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display font-bold text-base">{j.title}</h3>
                  {!j.isActive && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-surface-2 text-muted">Closed</span>}
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary-500/10 dark:bg-primary-400/15 text-primary-500 dark:text-primary-400 capitalize">{j.applicationMethod}</span>
                </div>
                <p className="text-sm text-muted flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{j.location} · {j.type}</span>
                  <span>·</span>
                  <span>{j.employerId?.companyName || j.employerId?.name || 'Unknown'} ({j.employerId?.verificationStatus ?? 'n/a'})</span>
                </p>
              </div>
              <button
                onClick={() => remove(j._id, j.title)}
                disabled={deletingId === j._id}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-2 border border-surface-border text-error text-sm font-bold disabled:opacity-50 transition-all shrink-0"
              >
                {deletingId === j._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Take down
              </button>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="px-4 py-2 rounded-xl bg-surface-1 border border-surface-border font-bold text-sm disabled:opacity-40 transition-all">Previous</button>
          <span className="text-sm text-muted">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className="px-4 py-2 rounded-xl bg-surface-1 border border-surface-border font-bold text-sm disabled:opacity-40 transition-all">Next</button>
        </div>
      )}
    </div>
  );
}
