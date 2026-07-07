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
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Listing Moderation</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Review every posting on the platform and remove fraudulent ones.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-accent-500" /></div>
      ) : jobs.length === 0 ? (
        <div className="p-14 rounded-3xl bg-surface-1 border border-surface-border shadow-sm text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-accent-100 dark:bg-accent-500/10 flex items-center justify-center mb-5">
            <Briefcase className="w-8 h-8 text-accent-600 dark:text-accent-300" />
          </div>
          <h4 className="text-lg font-bold text-gray-900 dark:text-white">No listings yet.</h4>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((j) => (
            <div key={j._id} className="p-6 rounded-2xl bg-surface-1 border border-surface-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-lg text-gray-900 dark:text-white">{j.title}</h3>
                  {!j.isActive && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400">Inactive</span>}
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-accent-100 text-accent-700 dark:bg-accent-500/10 dark:text-accent-300 capitalize">{j.applicationMethod}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{j.location} · {j.type}</span>
                  <span>·</span>
                  <span>{j.employerId?.companyName || j.employerId?.name || 'Unknown'} ({j.employerId?.verificationStatus ?? 'n/a'})</span>
                </p>
              </div>
              <button
                onClick={() => remove(j._id, j.title)}
                disabled={deletingId === j._id}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-2 border border-surface-border text-red-600 dark:text-red-400 text-sm font-bold hover:border-red-400/50 disabled:opacity-50 transition-all shrink-0"
              >
                {deletingId === j._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Take down
              </button>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="px-4 py-2 rounded-xl bg-surface-1 border border-surface-border font-bold text-sm disabled:opacity-40 hover:border-accent-400/40 transition-all">Previous</button>
          <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className="px-4 py-2 rounded-xl bg-surface-1 border border-surface-border font-bold text-sm disabled:opacity-40 hover:border-accent-400/40 transition-all">Next</button>
        </div>
      )}
    </div>
  );
}
