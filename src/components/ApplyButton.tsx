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
      <div className="w-full py-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 font-bold flex items-center justify-center gap-2">
        <CheckCircle className="w-5 h-5" /> Application Submitted
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-xl border border-red-500/20 text-center">
          {error}
        </div>
      )}
      <button
        onClick={handleApply}
        disabled={loading}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
          <>Apply Now <ArrowRight className="w-4 h-4" /></>
        )}
      </button>
    </div>
  );
}
