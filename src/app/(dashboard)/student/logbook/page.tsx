'use client';

import { useEffect, useState } from 'react';
import { Loader2, Plus, Download } from 'lucide-react';

interface LogbookEntry {
  _id: string;
  weekNumber: number;
  dayOfWeek: string;
  activityDescription: string;
  hoursWorked: number;
  date: string;
}

export default function StudentLogbook() {
  const [logs, setLogs] = useState<LogbookEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  const handleExportPdf = async () => {
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      const marginX = 48;
      const pageHeight = doc.internal.pageSize.getHeight();
      let y = 56;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('SIWES e-Logbook', marginX, y);
      y += 20;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Exported ${new Date().toLocaleDateString()} · ${logs.length} entr${logs.length === 1 ? 'y' : 'ies'}`, marginX, y);
      doc.setTextColor(0);
      y += 28;

      const sorted = [...logs].sort((a, b) => a.weekNumber - b.weekNumber || new Date(a.date).getTime() - new Date(b.date).getTime());

      for (const log of sorted) {
        if (y > pageHeight - 100) {
          doc.addPage();
          y = 56;
        }
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text(`Week ${log.weekNumber} · ${log.dayOfWeek}`, marginX, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`${new Date(log.date).toLocaleDateString()} · ${log.hoursWorked}h`, 400, y);
        y += 16;

        const lines = doc.splitTextToSize(log.activityDescription, 495);
        doc.text(lines, marginX, y);
        y += lines.length * 13 + 10;

        doc.setDrawColor(220);
        doc.line(marginX, y, marginX + 495, y);
        y += 18;
      }

      doc.save('siwes-logbook.pdf');
    } finally {
      setExporting(false);
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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-[26px] tracking-[-0.02em]">e-Logbook</h1>
          <p className="text-sm text-muted mt-1">Log your daily SIWES activities. This is your own private record — export it as a PDF to submit to your lecturer or SIWES office.</p>
        </div>
        <button
          onClick={handleExportPdf}
          disabled={exporting || logs.length === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-500 dark:bg-primary-400 text-white text-sm font-bold hover:brightness-110 disabled:opacity-50 transition-all shrink-0"
        >
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export PDF
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-error-bg border border-error/20 text-error text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Entry Form */}
        <div className="lg:col-span-1">
          <div className="bg-surface-1 border border-surface-border rounded-2xl p-6 sticky top-24">
            <h2 className="font-display font-bold text-lg mb-6 flex items-center gap-2">
              <Plus className="w-4 h-4 text-muted" /> Add New Entry
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider">Week</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    required
                    value={week}
                    onChange={(e) => setWeek(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-surface-border focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 outline-none text-[16px]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-muted uppercase tracking-wider">Hours</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    required
                    value={hours}
                    onChange={(e) => setHours(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-surface-border focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 outline-none text-[16px]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-muted uppercase tracking-wider">Day of Week</label>
                <select
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-surface-border focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 outline-none text-[16px]"
                >
                  <option value="Monday">Monday</option>
                  <option value="Tuesday">Tuesday</option>
                  <option value="Wednesday">Wednesday</option>
                  <option value="Thursday">Thursday</option>
                  <option value="Friday">Friday</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-muted uppercase tracking-wider">Description of Work</label>
                <textarea
                  required
                  rows={4}
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-surface-border focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 outline-none resize-none text-[16px]"
                  placeholder="What did you do today?"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 mt-2 rounded-lg bg-primary-500 dark:bg-primary-400 text-white font-bold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center text-sm"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Entry'}
              </button>
            </form>
          </div>
        </div>

        {/* Log History */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-display font-bold text-lg mb-2">Log History</h2>

          {logs.length === 0 ? (
            <div className="text-center p-12 bg-surface-1 border border-surface-border rounded-2xl">
              <p className="text-sm text-muted">No logbook entries found. Start writing your daily logs!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log._id} className="bg-surface-1 border border-surface-border rounded-2xl p-6 hover:border-primary-500/40 transition-all">
                  <div className="flex justify-between items-start mb-3 flex-wrap gap-2">
                    <div>
                      <h3 className="font-display font-bold text-base">Week {log.weekNumber} &middot; {log.dayOfWeek}</h3>
                      <p className="text-xs text-muted font-medium mt-1">{new Date(log.date).toLocaleDateString()}</p>
                    </div>
                    <span className="text-xs font-bold text-muted uppercase tracking-wider px-2.5 py-1 rounded-md bg-surface-2">
                      {log.hoursWorked}h logged
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{log.activityDescription}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
