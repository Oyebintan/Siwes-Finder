'use client';

import { useEffect, useState } from 'react';
import { Loader2, CheckCircle2, Clock } from 'lucide-react';

interface LogbookEntry {
  _id: string;
  studentId: {
    userId: {
      name: string;
      email: string;
    };
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
      fetchLogs(); // refresh
    } catch (err: any) {
      setError(err.message);
    } finally {
      setApprovingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Student Logbooks</h1>
        <p className="text-blue-100/60 mt-2">Review and approve daily logbook entries from your active interns.</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      {logs.length === 0 ? (
        <div className="text-center p-12 backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl">
          <p className="text-white/50 text-lg">No logbooks submitted yet.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {logs.map((log) => (
            <div key={log._id} className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 transition-all hover:bg-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-white">{log.studentId?.userId?.name || 'Unknown Student'}</h3>
                  <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-white/50 border border-white/10">
                    Week {log.weekNumber} • {log.dayOfWeek}
                  </span>
                  {log.isApproved && (
                    <span className="flex items-center gap-1 text-green-400 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Approved
                    </span>
                  )}
                </div>
                
                <p className="text-blue-100/80 leading-relaxed text-sm mb-3">
                  {log.activityDescription}
                </p>
                <div className="text-xs text-white/30 font-medium tracking-wider uppercase">
                  Time logged: {log.hoursWorked} hours • {new Date(log.date).toLocaleDateString()}
                </div>
              </div>

              {!log.isApproved && (
                <button
                  onClick={() => handleApprove(log._id)}
                  disabled={approvingId === log._id}
                  className="shrink-0 px-6 py-2.5 rounded-xl border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {approvingId === log._id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" /> Approve Entry
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
