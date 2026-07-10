'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Loader2, Users, BookOpen, ShieldAlert, GraduationCap, Building2 } from 'lucide-react';
import AvatarUpload from '@/components/AvatarUpload';

type SchoolStudent = {
  _id: string;
  name: string;
  department: string;
  faculty?: string;
  placedAt: string | null;
  applicationCount: number;
  logbookEntries: number;
  logbookApproved: number;
  isProfileComplete?: boolean;
};

export default function SchoolDashboard() {
  const { data: session } = useSession();
  const [students, setStudents] = useState<SchoolStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [error, setError] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/profile')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d?.avatarUrl) setAvatarUrl(d.avatarUrl); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/school/students')
      .then(async (r) => {
        const data = await r.json();
        if (cancelled) return;
        if (r.status === 403) setPendingApproval(true);
        else if (!r.ok) setError(data.error || 'Failed to load students');
        else setStudents(data.students || []);
      })
      .catch(() => { if (!cancelled) setError('Failed to load students'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

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
        <p className="text-muted text-sm leading-relaxed max-w-md mx-auto">
          Your school account is in the admin review queue. Student records — placements, logbooks and
          profiles — unlock automatically as soon as an administrator approves your institution.
        </p>
      </div>
    );
  }

  const placed = students.filter((s) => s.placedAt).length;
  const applying = students.filter((s) => !s.placedAt && s.applicationCount > 0).length;
  const totalLogs = students.reduce((sum, s) => sum + s.logbookEntries, 0);
  const departmentNames = [...new Set(students.map((s) => s.department))].sort();

  const departmentBreakdown = departmentNames.map((dept) => {
    const inDept = students.filter((s) => s.department === dept);
    const deptPlaced = inDept.filter((s) => s.placedAt).length;
    return {
      department: dept,
      total: inDept.length,
      placed: deptPlaced,
      placementRate: inDept.length ? Math.round((deptPlaced / inDept.length) * 100) : 0,
      logbookEntries: inDept.reduce((sum, s) => sum + s.logbookEntries, 0),
    };
  }).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-4 flex-wrap">
        <AvatarUpload key={avatarUrl} name={session?.user?.name} avatarUrl={avatarUrl} onUploaded={setAvatarUrl} size={56} />
        <div className="flex-1 min-w-[240px]">
          <h1 className="font-display font-extrabold text-[26px] tracking-[-0.02em] mb-1">
            {session?.user?.name || 'School'} — SIWES overview
          </h1>
          <div className="text-sm text-muted">
            Students who registered with your institution name, and where they stand. Click the crest to upload your school logo.
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-error-bg border border-error/20 text-error text-sm font-medium text-center">{error}</div>
      )}

      <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))]">
        <Kpi value={students.length} label="Registered students" />
        <Kpi value={placed} label="Placed" tone="success" />
        <Kpi value={applying} label="Actively applying" tone="warning" />
        <Kpi value={departmentNames.length} label="Departments" />
        <Kpi value={totalLogs} label="Logbook entries" />
      </div>

      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        <QuickCard
          href="/school/students"
          icon={Users}
          title="Student directory"
          body="Browse every student grouped by department, with placement status."
        />
        <QuickCard
          href="/school/logbooks"
          icon={BookOpen}
          title="Logbook oversight"
          body="Every entry across every student and company, filterable by department."
        />
        <QuickCard
          href="/school/profile"
          icon={Building2}
          title="Institution profile"
          body="Edit your institution's details and accreditation for admin review."
        />
      </div>

      {departmentNames.length > 0 && (
        <div>
          <div className="font-display font-bold text-[17px] mb-4">By department</div>
          <div className="bg-surface-1 rounded-2xl border border-surface-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-border text-left text-muted">
                    <th className="px-5 py-3 font-bold">Department</th>
                    <th className="px-5 py-3 font-bold">Students</th>
                    <th className="px-5 py-3 font-bold">Placed</th>
                    <th className="px-5 py-3 font-bold">Placement rate</th>
                    <th className="px-5 py-3 font-bold">Logbook entries</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentBreakdown.map((d, i) => (
                    <tr key={d.department} className={i < departmentBreakdown.length - 1 ? 'border-b border-surface-border/60' : ''}>
                      <td className="px-5 py-3 font-semibold whitespace-nowrap">{d.department}</td>
                      <td className="px-5 py-3 text-muted">{d.total}</td>
                      <td className="px-5 py-3 text-muted">{d.placed}</td>
                      <td className="px-5 py-3">
                        <span className={`text-[11.5px] font-bold px-2.5 py-1 rounded-full ${d.placementRate >= 50 ? 'bg-success-bg text-success' : d.placementRate > 0 ? 'bg-warning-bg text-warning' : 'bg-surface-2 text-muted'}`}>
                          {d.placementRate}%
                        </span>
                      </td>
                      <td className="px-5 py-3 text-muted">{d.logbookEntries}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="font-display font-bold text-[17px]">Recently placed students</div>
          <Link href="/school/students" className="text-[13.5px] font-bold text-primary-500 dark:text-primary-400">See all students →</Link>
        </div>
        {placed === 0 ? (
          <div className="bg-surface-1 rounded-2xl border border-surface-border p-10 text-center">
            <GraduationCap className="w-10 h-10 text-muted mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted">No students from your institution have been placed yet.</p>
          </div>
        ) : (
          <div className="bg-surface-1 rounded-2xl border border-surface-border overflow-hidden">
            {students.filter((s) => s.placedAt).slice(0, 6).map((s, i, arr) => (
              <Link key={s._id} href={`/school/students/${s._id}`} className={`flex items-center gap-3 px-5 py-4 flex-wrap hover:bg-surface-2 transition-colors ${i < arr.length - 1 ? 'border-b border-surface-border' : ''}`}>
                <div className="flex-1 text-sm font-semibold min-w-[160px]">{s.name}</div>
                <div className="text-[13px] text-muted">{s.department}</div>
                <span className="text-[11.5px] font-bold px-3 py-1 rounded-full bg-success-bg text-success">● {s.placedAt}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Kpi({ value, label, tone }: { value: number | string; label: string; tone?: 'warning' | 'success' }) {
  const color = tone === 'warning' ? 'text-warning' : tone === 'success' ? 'text-success' : 'text-foreground';
  return (
    <div className="glass-card bg-surface-1 rounded-[14px] p-4">
      <div className={`font-mono font-bold text-[22px] ${color}`}>{value}</div>
      <div className="text-xs text-muted mt-0.5">{label}</div>
    </div>
  );
}

function QuickCard({ href, icon: Icon, title, body }: { href: string; icon: typeof Users; title: string; body: string }) {
  return (
    <Link href={href} className="bg-surface-1 border border-surface-border rounded-[14px] p-5 hover:border-primary-500/40 transition-colors">
      <div className="w-[38px] h-[38px] rounded-[10px] bg-primary-500/10 dark:bg-primary-400/15 text-primary-500 dark:text-primary-400 flex items-center justify-center mb-3">
        <Icon className="w-[18px] h-[18px]" />
      </div>
      <div className="text-[14px] font-bold mb-1">{title}</div>
      <div className="text-[12.5px] text-muted leading-relaxed">{body}</div>
    </Link>
  );
}
