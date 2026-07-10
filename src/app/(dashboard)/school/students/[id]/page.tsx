'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle2, Clock, FileText } from 'lucide-react';

type StudentDetail = {
  name: string;
  email: string;
  avatarUrl?: string;
  faculty?: string;
  courseOfStudy?: string;
  level?: string;
  phone?: string;
  skills?: string[];
  resumeUrl?: string;
  siwesDuration?: string;
  preferredState?: string;
};

type AppRow = {
  _id: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  createdAt: string;
  job?: { title?: string; location?: string };
  employer?: { companyName?: string; name?: string };
};

type LogRow = {
  _id: string;
  weekNumber: number;
  dayOfWeek: string;
  activityDescription: string;
  hoursWorked: number;
  isApproved: boolean;
  date: string;
};

const STATUS_BADGE: Record<string, string> = {
  Pending: 'bg-warning-bg text-warning',
  Accepted: 'bg-success-bg text-success',
  Rejected: 'bg-error-bg text-error',
};

function initials(name?: string) {
  if (!name) return '??';
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

export default function SchoolStudentDetail() {
  const { id } = useParams<{ id: string }>();
  const [student, setStudent] = useState<StudentDetail | null>(null);
  const [applications, setApplications] = useState<AppRow[]>([]);
  const [logbook, setLogbook] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    fetch(`/api/school/students/${id}`)
      .then(async (r) => {
        const data = await r.json();
        if (cancelled) return;
        if (!r.ok) setError(data.error || 'Could not load this student.');
        else {
          setStudent(data.student);
          setApplications(data.applications || []);
          setLogbook(data.logbook || []);
        }
      })
      .catch(() => { if (!cancelled) setError('Could not load this student.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
  }
  if (error || !student) {
    return (
      <div className="max-w-[640px] mx-auto py-16 text-center">
        <p className="text-sm text-error font-medium mb-4">{error || 'Student not found.'}</p>
        <Link href="/school/students" className="text-primary-500 dark:text-primary-400 font-bold text-sm">← Back to students</Link>
      </div>
    );
  }

  const approvedLogs = logbook.filter((l) => l.isApproved).length;

  return (
    <div className="max-w-[960px] mx-auto space-y-6 animate-fade-in-up">
      <Link href="/school/students" className="inline-flex text-[13.5px] font-semibold text-muted">← Back to students</Link>

      {/* Profile header */}
      <div className="bg-surface-1 rounded-2xl border border-surface-border p-7 flex items-center gap-5 flex-wrap">
        {student.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={student.avatarUrl} alt="" className="w-16 h-16 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary-500 dark:bg-primary-400 text-white flex items-center justify-center font-display font-extrabold text-xl shrink-0">
            {initials(student.name)}
          </div>
        )}
        <div className="flex-1 min-w-[200px]">
          <div className="font-display font-bold text-lg">{student.name}</div>
          <div className="text-[13.5px] text-muted mt-0.5">
            {[student.courseOfStudy, student.faculty, student.level].filter(Boolean).join(' · ') || 'Profile incomplete'}
          </div>
          <div className="text-[12.5px] text-muted mt-0.5">{student.email}{student.phone ? ` · ${student.phone}` : ''}</div>
        </div>
        {student.resumeUrl && (
          <a href={student.resumeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-500/10 dark:bg-primary-400/15 text-primary-500 dark:text-primary-400 text-sm font-bold">
            <FileText className="w-4 h-4" /> View resume
          </a>
        )}
      </div>

      {(student.skills?.length || 0) > 0 && (
        <div className="flex flex-wrap gap-2">
          {student.skills!.map((s) => (
            <span key={s} className="px-3.5 py-1.5 rounded-full text-[12.5px] font-semibold bg-primary-500/10 dark:bg-primary-400/15 text-primary-500 dark:text-primary-400">{s}</span>
          ))}
        </div>
      )}

      {/* Applications */}
      <div>
        <div className="font-display font-bold text-[17px] mb-4">Applications ({applications.length})</div>
        {applications.length === 0 ? (
          <div className="bg-surface-1 rounded-2xl border border-surface-border p-8 text-center text-sm text-muted">No applications submitted yet.</div>
        ) : (
          <div className="bg-surface-1 rounded-2xl border border-surface-border overflow-hidden">
            {applications.map((a, i) => (
              <div key={a._id} className={`flex items-center gap-3 px-5 py-4 flex-wrap ${i < applications.length - 1 ? 'border-b border-surface-border' : ''}`}>
                <div className="flex-1 text-sm font-semibold min-w-[180px]">
                  {a.job?.title || 'Untitled role'} <span className="text-muted font-normal">— {a.employer?.companyName || a.employer?.name || 'Unknown company'}</span>
                </div>
                <div className="text-[12px] text-muted">{new Date(a.createdAt).toLocaleDateString()}</div>
                <span className={`text-[11.5px] font-bold px-3 py-1 rounded-full ${STATUS_BADGE[a.status] || 'bg-surface-2 text-muted'}`}>{a.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logbook */}
      <div>
        <div className="font-display font-bold text-[17px] mb-4">
          e-Logbook <span className="text-muted text-sm font-semibold">({approvedLogs}/{logbook.length} approved by employer)</span>
        </div>
        {logbook.length === 0 ? (
          <div className="bg-surface-1 rounded-2xl border border-surface-border p-8 text-center text-sm text-muted">No logbook entries yet.</div>
        ) : (
          <div className="space-y-3">
            {logbook.map((log) => (
              <div key={log._id} className="bg-surface-1 border border-surface-border rounded-2xl p-5">
                <div className="flex justify-between items-start gap-3 mb-2.5 flex-wrap">
                  <div>
                    <div className="text-sm font-bold">Week {log.weekNumber} · {log.dayOfWeek}</div>
                    <div className="text-[11.5px] text-muted font-medium mt-0.5">{new Date(log.date).toLocaleDateString()} · {log.hoursWorked} hours</div>
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
    </div>
  );
}
