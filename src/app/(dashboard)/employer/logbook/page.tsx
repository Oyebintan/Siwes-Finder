'use client';

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, BookOpen } from 'lucide-react';

interface LogbookEntry {
  _id: string;
  studentId: {
    name: string;
    email: string;
  };
  weekNumber: number;
  dayOfWeek: string;
  activityDescription: string;
  hoursWorked: number;
  isApproved: boolean;
  date: string;
}

export default function EmployerLogbook() {
  const [logs, setLogs] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logbook');
      if (!res.ok) throw new Error('Failed to fetch logbooks');
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logbooks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLogs();
  }, []);

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    setError('');
    try {
      const res = await fetch(`/api/logbook/${id}`, { method: 'PUT' });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to approve');
      await fetchLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    } finally {
      setApprovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      <div>
        <h1 className="font-display font-extrabold text-[26px] tracking-[-0.02em]">Student logbooks</h1>
        <p className="text-sm text-muted mt-1">Review and approve daily logbook entries from your active interns.</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-error-bg border border-error/20 text-error text-sm font-medium">
          {error}
        </div>
      )}

      {logs.length === 0 ? (
        <div className="p-14 rounded-3xl bg-surface-1 border border-surface-border text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 dark:bg-primary-400/15 flex items-center justify-center mb-5">
            <BookOpen className="w-8 h-8 text-primary-500 dark:text-primary-400" />
          </div>
          <h4 className="font-display font-bold text-lg">No logbooks submitted yet.</h4>
          <p className="text-sm text-muted mt-1">Entries from your interns&apos; e-Logbooks will show up here for approval.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {logs.map((log) => (
            <div key={log._id} className="bg-surface-1 border border-surface-border rounded-2xl p-6 hover:border-primary-500/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <h3 className="font-display font-bold text-base">{log.studentId?.name || 'Unknown Student'}</h3>
                  <span className="text-xs font-bold text-muted uppercase tracking-wider px-2.5 py-1 rounded-md bg-surface-2">
                    Week {log.weekNumber} &middot; {log.dayOfWeek}
                  </span>
                  {log.isApproved && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-success-bg border border-success/20 text-success text-xs font-bold uppercase tracking-wider">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                    </span>
                  )}
                </div>

                <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap mb-3">
                  {log.activityDescription}
                </p>
                <p className="text-xs text-muted font-medium">
                  {log.hoursWorked}h logged &middot; {new Date(log.date).toLocaleDateString()}
                </p>
              </div>

              {!log.isApproved && (
                <button
                  onClick={() => handleApprove(log._id)}
                  disabled={approvingId === log._id}
                  className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-primary-500 dark:bg-primary-400 text-white text-sm font-bold hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  {approvingId === log._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Approve Entry
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
