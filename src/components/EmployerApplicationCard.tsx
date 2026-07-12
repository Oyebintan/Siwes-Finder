'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, FileText, User, MapPin } from 'lucide-react';
import ApplicationMessageButton from './ApplicationMessageButton';

export type EmployerApplication = {
  _id: string;
  status: 'Pending' | 'Accepted' | 'Rejected';
  createdAt: string;
  job: { title: string };
  student: {
    name: string;
    email: string;
    university?: string;
    courseOfStudy?: string;
    resumeUrl?: string;
  };
};

export default function EmployerApplicationCard({ app }: { app: EmployerApplication }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(app.status);
  const router = useRouter();

  const handleUpdateStatus = async (newStatus: 'Accepted' | 'Rejected') => {
    setLoading(true);
    try {
      const res = await fetch(`/api/applications/${app._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface-1 border border-surface-border hover:border-accent-400/40 shadow-sm rounded-2xl p-6 transition-all">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-accent-600 dark:text-accent-300 mb-1">{app.job.title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Applied on {new Date(app.createdAt).toLocaleDateString()}</p>
        </div>
        {status === 'Pending' && <span className="px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-200 dark:border-amber-800/40">Pending</span>}
        {status === 'Accepted' && <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-800/40">Accepted</span>}
        {status === 'Rejected' && <span className="px-3 py-1 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-800/40">Rejected</span>}
      </div>

      <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-surface-2 mb-6">
        <div className="w-12 h-12 rounded-full bg-white dark:bg-surface-1 border border-gray-100 dark:border-surface-border flex items-center justify-center shrink-0">
          <User className="w-6 h-6 text-gray-400 dark:text-gray-500" />
        </div>
        <div>
          <h4 className="font-bold text-gray-900 dark:text-white">{app.student.name}</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400">{app.student.email}</p>
          <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-gray-600 dark:text-gray-300">
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {app.student.university || 'Not provided'}</span>
            <span>&bull;</span>
            <span>{app.student.courseOfStudy || 'Not provided'}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <ApplicationMessageButton applicationId={app._id} label="Message" />
        {app.student.resumeUrl ? (
          <a href={app.student.resumeUrl} target="_blank" rel="noopener noreferrer"
            className="flex-1 px-4 py-2.5 rounded-xl bg-accent-50 dark:bg-accent-500/10 text-accent-600 dark:text-accent-300 hover:bg-accent-100 dark:hover:bg-accent-500/20 text-sm font-bold flex items-center justify-center gap-2 transition-colors">
            <FileText className="w-4 h-4" /> View Resume
          </a>
        ) : (
          <span className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-surface-2 text-gray-400 dark:text-gray-500 text-sm font-bold flex items-center justify-center gap-2">
            <FileText className="w-4 h-4" /> No resume yet
          </span>
        )}

        {status === 'Pending' && (
          <div className="flex gap-2">
            <button onClick={() => handleUpdateStatus('Accepted')} disabled={loading}
              className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-50" title="Accept Candidate">
              <CheckCircle className="w-5 h-5" />
            </button>
            <button onClick={() => handleUpdateStatus('Rejected')} disabled={loading}
              className="p-2.5 rounded-xl bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors disabled:opacity-50" title="Reject Candidate">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
