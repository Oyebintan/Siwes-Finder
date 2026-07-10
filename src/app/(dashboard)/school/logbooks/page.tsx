'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, BookOpen, ShieldAlert, CheckCircle2, Clock, Search } from 'lucide-react';

type LogEntry = {
  _id: string;
  studentId: string;
  studentName: string;
  department: string;
  faculty?: string;
  weekNumber: number;
  dayOfWeek: string;
  activityDescription: string;
  hoursWorked: number;
  isApproved: boolean;
  date: string;
};

const STATUS_TABS = ['all', 'approved', 'pending'] as const;

export default function SchoolLogbooks() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]>('all');
  const [department, setDepartment] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const params = new URLSearchParams();
    if (status !== 'all') params.set('status', status);
    if (department !== 'all') params.set('department', department);

    fetch(`/api/school/logbooks?${params.toString()}`)
      .then(async (r) => {
        const data = await r.json();
        if (cancelled) return;
        if (r.status === 403) setPendingApproval(true);
        else if (r.ok) {
          setEntries(data.entries || []);
          setDepartments(data.departments || []);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [status, department]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => [e.studentName, e.department, e.activityDescription].join(' ').toLowerCase().includes(q));
  }, [entries, query]);

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
  }

  if (pendingApproval) {
    return (
      <div className="max-w-[640px] mx-auto py-16 text-center animate-fade-in-up">
        <div className="w-16 h-16 rounded-2xl bg-warning-bg flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-8 h-8 text-warning" />
        </div>
        <h1 className="font-display font-extrabold text-[24px] tracking-[-0.02em] mb-2">Awaiting verification</h1>
        <p className="text-muted text-sm max-w-md mx-auto">Logbook oversight unlocks once an admin approves your school account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="font-display font-extrabold text-[26px] tracking-[-0.02em] mb-1">Logbooks</h1>
        <div className="text-sm text-muted">
          Every entry your students have written, across every company. Approval is the employer&apos;s call — this is oversight, not a queue for you to act on.
        </div>
      </div>

      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex items-center gap-2.5 bg-surface-1 border-[1.5px] border-surface-border rounded-[10px] px-4 py-3 flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-muted shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search student, department, activity…"
            className="flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted"
          />
        </div>
        <select
          value={department}
          onChange={(e) => setDepartment(e.target.value)}
          className="border-[1.5px] border-surface-border rounded-[10px] px-4 py-3 text-[13.5px] font-semibold bg-surface-1 text-foreground"
        >
          <option value="all">All departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setStatus(t)}
            className={`px-4 py-2 rounded-full text-[13px] font-bold capitalize transition-all ${status === t ? 'bg-primary-500 dark:bg-primary-400 text-white' : 'bg-surface-1 border-[1.5px] border-surface-border text-muted'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="p-14 rounded-3xl bg-surface-1 border border-surface-border text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 dark:bg-primary-400/15 flex items-center justify-center mb-5">
            <BookOpen className="w-8 h-8 text-primary-500 dark:text-primary-400" />
          </div>
          <h4 className="font-display font-bold text-lg">No logbook entries found.</h4>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((log) => (
            <div key={log._id} className="bg-surface-1 border border-surface-border rounded-2xl p-5">
              <div className="flex justify-between items-start gap-3 mb-2.5 flex-wrap">
                <div>
                  <Link href={`/school/students/${log.studentId}`} className="text-sm font-bold hover:text-primary-500 dark:hover:text-primary-400 transition-colors">
                    {log.studentName}
                  </Link>
                  <div className="text-[11.5px] text-muted font-medium mt-0.5">
                    {log.department} · Week {log.weekNumber} · {log.dayOfWeek} · {new Date(log.date).toLocaleDateString()} · {log.hoursWorked}h
                  </div>
                </div>
                {log.isApproved ? (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-success-bg text-success text-[11px] font-bold uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-warning-bg text-warning text-[11px] font-bold uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5" /> Pending
                  </span>
                )}
              </div>
              <p className="text-sm text-muted leading-relaxed whitespace-pre-wrap">{log.activityDescription}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
