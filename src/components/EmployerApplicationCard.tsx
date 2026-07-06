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
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 transition-all hover:border-cyan-500/50">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-bold text-cyan-400 mb-1">{app.job.title}</h3>
          <p className="text-sm text-foreground/60">Applied on {new Date(app.createdAt).toLocaleDateString()}</p>
        </div>
        
        {status === 'Pending' && <span className="px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-bold border border-yellow-500/20">Pending</span>}
        {status === 'Accepted' && <span className="px-3 py-1 rounded-full bg-green-500/10 text-green-500 text-xs font-bold border border-green-500/20">Accepted</span>}
        {status === 'Rejected' && <span className="px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-xs font-bold border border-red-500/20">Rejected</span>}
      </div>

      <div className="flex items-start gap-4 p-4 rounded-xl bg-black/20 mb-6">
        <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0">
          <User className="w-6 h-6 text-foreground/50" />
        </div>
        <div>
          <h4 className="font-bold">{app.student.name}</h4>
          <p className="text-sm text-foreground/60">{app.student.email}</p>
          <div className="flex items-center gap-3 mt-2 text-sm text-foreground/80">
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {app.student.university}</span>
            <span>&bull;</span>
            <span>{app.student.courseOfStudy}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <a 
          href={app.student.resumeUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 text-sm font-bold flex items-center justify-center gap-2 transition-colors"
        >
          <FileText className="w-4 h-4" /> View Resume
        </a>
        
        {status === 'Pending' && (
          <div className="flex gap-2">
            <button 
              onClick={() => handleUpdateStatus('Accepted')}
              disabled={loading}
              className="p-2.5 rounded-xl bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-colors disabled:opacity-50"
              title="Accept Candidate"
            >
              <CheckCircle className="w-5 h-5" />
            </button>
            <button 
              onClick={() => handleUpdateStatus('Rejected')}
              disabled={loading}
              className="p-2.5 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors disabled:opacity-50"
              title="Reject Candidate"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
