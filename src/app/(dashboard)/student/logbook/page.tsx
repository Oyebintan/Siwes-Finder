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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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
      fetchLogs(); // Refresh list
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
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
        <h1 className="text-3xl font-extrabold text-white tracking-tight">SIWES e-Logbook</h1>
        <p className="text-blue-100/60 mt-2">Log your daily activities. Your supervisor will review and approve them.</p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Entry Form */}
        <div className="lg:col-span-1">
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6 shadow-2xl sticky top-8">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-cyan-400" /> Add New Entry
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/70 uppercase">Week Number</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    required
                    value={week}
                    onChange={(e) => setWeek(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/5 focus:border-blue-500/50 text-white outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/70 uppercase">Hours</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    required
                    value={hours}
                    onChange={(e) => setHours(Number(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/5 focus:border-blue-500/50 text-white outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/70 uppercase">Day of Week</label>
                <select
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/5 focus:border-blue-500/50 text-white outline-none [&>option]:bg-[#0a0f1c]"
                >
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-white/70 uppercase">Description of Work Done</label>
                <textarea
                  required
                  rows={4}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/5 focus:border-blue-500/50 text-white outline-none resize-none"
                  placeholder="e.g. Configured the local server and tested the API endpoints..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 mt-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit Entry'}
              </button>
            </form>
          </div>
        </div>

        {/* Log History */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xl font-bold text-white mb-6">Log History</h2>
          
          {logs.length === 0 ? (
            <div className="text-center p-12 backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl">
              <p className="text-white/50">No logbook entries found. Start writing your daily logs!</p>
            </div>
          ) : (
            logs.map((log) => (
              <div key={log._id} className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 transition-all hover:bg-white/10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Week {log.weekNumber} - {log.dayOfWeek}</h3>
                    <p className="text-sm text-blue-100/40">{new Date(log.date).toLocaleDateString()}</p>
                  </div>
                  {log.isApproved ? (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Approved
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-bold">
                      <Clock className="w-4 h-4" /> Pending Approval
                    </span>
                  )}
                </div>
                <p className="text-blue-100/80 leading-relaxed whitespace-pre-wrap">{log.activityDescription}</p>
                <div className="mt-4 pt-4 border-t border-white/10 text-sm text-white/40 font-medium uppercase tracking-wider">
                  Time logged: {log.hoursWorked} hours
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
