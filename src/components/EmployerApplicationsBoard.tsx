'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, UserCheck } from 'lucide-react';
import EmployerApplicationCard, { type EmployerApplication } from './EmployerApplicationCard';

export default function EmployerApplicationsBoard({ applications }: { applications: EmployerApplication[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkActing, setBulkActing] = useState(false);
  const [error, setError] = useState('');

  const pendingIds = applications.filter((a) => a.status === 'Pending').map((a) => a._id);
  const allPendingSelected = pendingIds.length > 0 && pendingIds.every((id) => selected.has(id));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allPendingSelected ? new Set() : new Set(pendingIds));
  };

  const runBulk = async (status: 'Accepted' | 'Rejected') => {
    if (selected.size === 0 || bulkActing) return;
    setBulkActing(true);
    setError('');
    try {
      const res = await fetch('/api/applications/bulk', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selected), status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Could not update selected applications.');
      }
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update selected applications.');
    } finally {
      setBulkActing(false);
    }
  };

  if (applications.length === 0) {
    return (
      <div className="text-center py-20 bg-surface-1 border border-surface-border shadow-sm rounded-3xl">
        <UserCheck className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">No applicants yet</h3>
        <p className="text-gray-500 dark:text-gray-400">When students apply, they will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pendingIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-4 rounded-2xl bg-surface-1 border border-surface-border">
          <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
            <input type="checkbox" checked={allPendingSelected} onChange={toggleAll} className="w-4 h-4 accent-accent-500" />
            Select all pending ({pendingIds.length})
          </label>
          {selected.size > 0 && (
            <>
              <span className="text-sm text-muted">{selected.size} selected</span>
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => runBulk('Rejected')}
                  disabled={bulkActing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {bulkActing ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Reject selected
                </button>
                <button
                  onClick={() => runBulk('Accepted')}
                  disabled={bulkActing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {bulkActing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Accept selected
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-error-bg border border-error/20 text-error text-sm font-medium">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {applications.map((app) => (
          <EmployerApplicationCard
            key={app._id}
            app={app}
            selectable={app.status === 'Pending'}
            selected={selected.has(app._id)}
            onToggleSelect={() => toggle(app._id)}
          />
        ))}
      </div>
    </div>
  );
}
