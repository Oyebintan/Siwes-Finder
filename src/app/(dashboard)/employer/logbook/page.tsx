'use client';

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, Clock } from 'lucide-react';

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      const res = await fetch(`/api/logbook/${id}`, { method: 'PUT' });
      if (!res.ok) throw new Error('Failed to approve');
      fetchLogs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApprovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">Student Logbooks</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Review and approve daily logbook entries from your active interns.</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-sm font-medium">
          {error}
        </div>
      )}

      {logs.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-gray-200 dark:border-gray-800 shadow-sm rounded-2xl">
          <p className="text-gray-500 dark:text-gray-400 text-sm">No logbooks submitted yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {logs.map((log) => (
            <div key={log._id} className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6 transition-all hover:border-gray-300 dark:hover:border-gray-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">{log.studentId?.name || 'Unknown Student'}</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider border border-gray-200 dark:border-gray-800">
                    Week {log.weekNumber} &middot; {log.dayOfWeek}
                  </span>
                  {log.isApproved && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400 text-[10px] font-bold uppercase tracking-wider">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                    </span>
                  )}
                </div>
                
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm mb-3">
                  {log.activityDescription}
                </p>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium tracking-wider uppercase">
                  Time logged: {log.hoursWorked} hours &middot; {new Date(log.date).toLocaleDateString()}
                </div>
              </div>

              {!log.isApproved && (
                <button
                  onClick={() => handleApprove(log._id)}
                  disabled={approvingId === log._id}
                  className="shrink-0 px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {approvingId === log._id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Approve Entry
                    </>
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
