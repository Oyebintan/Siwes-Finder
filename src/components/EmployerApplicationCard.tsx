'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, XCircle, FileText, User, MapPin } from 'lucide-react';

export default function EmployerApplicationCard({ app }: { app: any }) {
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
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-cyan-500/50 shadow-sm rounded-2xl p-6 transition-all">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-cyan-600 dark:text-cyan-400 mb-1">{app.job.title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Applied on {new Date(app.createdAt).toLocaleDateString()}</p>
        </div>

        {status === 'Pending' && <span className="px-3 py-1 rounded-full bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 text-xs font-bold border border-yellow-200 dark:border-yellow-800/50">Pending</span>}
        {status === 'Accepted' && <span className="px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-bold border border-green-200 dark:border-green-800/50">Accepted</span>}
        {status === 'Rejected' && <span className="px-3 py-1 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold border border-red-200 dark:border-red-800/50">Rejected</span>}
      </div>

      <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 mb-6">
        <div className="w-12 h-12 rounded-full bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 flex items-center justify-center shrink-0">
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
        {app.student.resumeUrl ? (

          href = { app.student.resumeUrl }
            target="_blank"
        rel="noopener noreferrer"
        className="flex-1 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-sm font-bold flex items-center justify-center gap-2 transition-colors"
          >
        <FileText className="w-4 h-4" /> View Resume
      </a>
      ) : (
      <span className="flex-1 px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-sm font-bold flex items-center justify-center gap-2">
        <FileText className="w-4 h-4" /> No resume yet
      </span>
        )}

      {status === 'Pending' && (
        <div className="flex gap-2">
          <button
            onClick={() => handleUpdateStatus('Accepted')}
            disabled={loading}
            className="p-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors disabled:opacity-50"
            title="Accept Candidate"
          >
            <CheckCircle className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleUpdateStatus('Rejected')}
            disabled={loading}
            className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
            title="Reject Candidate"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
    </div >
  );
}