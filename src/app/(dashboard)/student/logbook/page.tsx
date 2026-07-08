'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, CheckCircle2, Clock } from 'lucide-react';

interface LogbookEntry {
  _id: string;
  weekNumber: number;
  dayOfWeek: string;
  activityDescription: string;
  hoursWorked: number;
  isApproved: boolean;
  date: string;
}

export default function StudentLogbook() {
  const [logs, setLogs] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [week, setWeek] = useState(1);
  const [day, setDay] = useState('Monday');
  const [desc, setDesc] = useState('');
  const [hours, setHours] = useState(8);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/logbook');
      if (!res.ok) throw new Error('Failed to fetch logbook');
      const data = await res.json();
      setLogs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch logbook');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLogs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/logbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekNumber: week,
          dayOfWeek: day,
          activityDescription: desc,
          hoursWorked: hours,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit log');
      }

      setDesc('');
      fetchLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit log');
    } finally {
      setSubmitting(false);
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">e-Logbook</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">Log your daily activities for supervisor approval.</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-400 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Entry Form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <Plus className="w-4 h-4 text-gray-400" /> Add New Entry
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Week</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    required
                    value={week}
                    onChange={(e) => setWeek(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white outline-none text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Hours</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    required
                    value={hours}
                    onChange={(e) => setHours(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white outline-none text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Day of Week</label>
                <select
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white outline-none text-sm"
                >
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description of Work</label>
                <textarea
                  required
                  rows={4}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-white outline-none resize-none text-sm"
                  placeholder="What did you do today?"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 mt-2 rounded-xl bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center justify-center text-sm"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Entry'}
              </button>
            </form>
          </div>
        </div>

        {/* Log History */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Log History</h2>
          
          {logs.length === 0 ? (
            <div className="text-center p-12 bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
              <p className="text-gray-500 dark:text-gray-400 text-sm">No logbook entries found. Start writing your daily logs!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log._id} className="bg-white dark:bg-slate-900/60 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6 transition-all hover:border-gray-300 dark:hover:border-gray-700 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 dark:text-white">Week {log.weekNumber} &middot; {log.dayOfWeek}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-1">{new Date(log.date).toLocaleDateString()}</p>
                    </div>
                    {log.isApproved ? (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 text-green-700 dark:text-green-400 text-xs font-bold uppercase tracking-wider">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/50 text-yellow-700 dark:text-yellow-400 text-xs font-bold uppercase tracking-wider">
                        <Clock className="w-3.5 h-3.5" /> Pending
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{log.activityDescription}</p>
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/50 text-xs text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                    Time logged: {log.hoursWorked} hours
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
