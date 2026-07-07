'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, CheckCircle } from 'lucide-react';

export default function ApplyButton({ jobId }: { jobId: string }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleApply = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to apply');
      }
      setSuccess(true);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="w-full py-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-2">
        <CheckCircle className="w-5 h-5" /> Application Submitted
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-800/40 text-center">
          {error}
        </div>
      )}
      <button onClick={handleApply} disabled={loading}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-accent-700 to-accent-400 text-white font-bold hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (<>Apply Now <ArrowRight className="w-4 h-4" /></>)}
      </button>
    </div>
  );
}
