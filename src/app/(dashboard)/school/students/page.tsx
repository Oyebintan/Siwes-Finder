'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2, Search, Users, ShieldAlert } from 'lucide-react';

type SchoolStudent = {
  _id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  faculty?: string;
  department: string;
  level?: string;
  placedAt: string | null;
  applicationCount: number;
  logbookEntries: number;
  logbookApproved: number;
};

function initials(name?: string) {
  if (!name) return '??';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

export default function SchoolStudents() {
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/school/students')
      .then(async (r) => {
        const data = await r.json();
        if (cancelled) return;
        if (r.status === 403) setPendingApproval(true);
        else if (r.ok) setStudents(data.students || []);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Group by department; a faculty heading is shown when students provided it.
  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? students.filter((s) =>
          [s.name, s.email, s.department, s.faculty, s.level].filter(Boolean).join(' ').toLowerCase().includes(q)
        )
      : students;
    const groups = new Map<string, SchoolStudent[]>();
    for (const s of filtered) {
      const key = s.faculty ? `${s.faculty} — ${s.department}` : s.department;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(s);
    }
    return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [students, query]);

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
        <p className="text-muted text-sm max-w-md mx-auto">Student records unlock once an admin approves your school account.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div>
        <h1 className="font-display font-extrabold text-[26px] tracking-[-0.02em] mb-1">Students</h1>
        <div className="text-sm text-muted">Grouped by faculty and department. Open a student to view their logbook and applications.</div>
      </div>

      <div className="flex items-center gap-2.5 bg-surface-1 border-[1.5px] border-surface-border rounded-[10px] px-4 py-3 max-w-md">
        <Search className="w-4 h-4 text-muted shrink-0" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, department, level…"
          className="flex-1 bg-transparent text-[16px] outline-none placeholder:text-muted"
        />
      </div>

      {grouped.length === 0 ? (
        <div className="p-14 rounded-3xl bg-surface-1 border border-surface-border text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 dark:bg-primary-400/15 flex items-center justify-center mb-5">
            <Users className="w-8 h-8 text-primary-500 dark:text-primary-400" />
          </div>
          <h4 className="font-display font-bold text-lg mb-1">No students found.</h4>
          <p className="text-sm text-muted max-w-sm">
            Students appear here automatically when the university on their profile matches your institution name exactly.
          </p>
        </div>
      ) : (
        grouped.map(([dept, list]) => (
          <div key={dept}>
            <div className="font-display font-bold text-[15px] mb-3">{dept} <span className="text-muted font-semibold">({list.length})</span></div>
            <div className="bg-surface-1 rounded-2xl border border-surface-border overflow-hidden">
              {list.map((s, i) => (
                <Link
                  key={s._id}
                  href={`/school/students/${s._id}`}
                  className={`flex items-center gap-3.5 px-5 py-4 flex-wrap hover:bg-surface-2 transition-colors ${i < list.length - 1 ? 'border-b border-surface-border' : ''}`}
                >
                  {s.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-primary-500 dark:bg-primary-400 text-white flex items-center justify-center font-display font-bold text-xs shrink-0">
                      {initials(s.name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-[160px]">
                    <div className="text-sm font-bold">{s.name}</div>
                    <div className="text-[12px] text-muted">{s.level || 'Level not set'} · {s.logbookApproved}/{s.logbookEntries} logbook entries approved</div>
                  </div>
                  {s.placedAt ? (
                    <span className="text-[11.5px] font-bold px-3 py-1 rounded-full bg-success-bg text-success">● Placed — {s.placedAt}</span>
                  ) : s.applicationCount > 0 ? (
                    <span className="text-[11.5px] font-bold px-3 py-1 rounded-full bg-warning-bg text-warning">{s.applicationCount} application{s.applicationCount === 1 ? '' : 's'}</span>
                  ) : (
                    <span className="text-[11.5px] font-bold px-3 py-1 rounded-full bg-surface-2 text-muted">Not applied yet</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
