'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function EmployerPostJob() {
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState<'On-site' | 'Remote' | 'Hybrid'>('On-site');
  const [duration, setDuration] = useState('6 Months');
  const [stipend, setStipend] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          location,
          type,
          duration,
          stipend: stipend || 'Unpaid',
          description,
          requirements: requirements.split('\n').map(r => r.trim()).filter(Boolean),
        }),
      });

      if (!res.ok) throw new Error('Failed to post job');

      setSuccess(true);
      setTitle(''); setLocation(''); setStipend(''); setDescription(''); setRequirements('');
      router.refresh();
      setTimeout(() => router.push('/employer/dashboard'), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Post a Placement</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Create a new SIWES opening to attract top student talent.</p>
      </div>

      <div className="bg-surface-1 border border-surface-border shadow-sm rounded-2xl p-6 md:p-8">
        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 text-sm">
            Job posted successfully! Redirecting to dashboard...
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-800/40 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Job Title</label>
              <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-surface-2 border border-gray-200 dark:border-surface-border focus:border-brand-400 focus:ring-1 focus:ring-brand-400 text-gray-900 dark:text-white transition-all outline-none"
                placeholder="e.g. Frontend Developer Intern" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Location</label>
              <input type="text" required value={location} onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-surface-2 border border-gray-200 dark:border-surface-border focus:border-brand-400 focus:ring-1 focus:ring-brand-400 text-gray-900 dark:text-white transition-all outline-none"
                placeholder="e.g. Lagos, Nigeria" />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Work Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as any)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-surface-2 border border-gray-200 dark:border-surface-border focus:border-brand-400 focus:ring-1 focus:ring-brand-400 text-gray-900 dark:text-white transition-all outline-none">
                <option value="On-site">On-site</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Stipend (Monthly)</label>
              <input type="text" value={stipend} onChange={(e) => setStipend(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-surface-2 border border-gray-200 dark:border-surface-border focus:border-brand-400 focus:ring-1 focus:ring-brand-400 text-gray-900 dark:text-white transition-all outline-none"
                placeholder="e.g. ₦50,000 (Optional)" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Job Description</label>
            <textarea required rows={5} value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-surface-2 border border-gray-200 dark:border-surface-border focus:border-brand-400 focus:ring-1 focus:ring-brand-400 text-gray-900 dark:text-white transition-all outline-none resize-none"
              placeholder="Describe the day-to-day responsibilities..." />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Requirements (One per line)</label>
            <textarea required rows={4} value={requirements} onChange={(e) => setRequirements(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-surface-2 border border-gray-200 dark:border-surface-border focus:border-brand-400 focus:ring-1 focus:ring-brand-400 text-gray-900 dark:text-white transition-all outline-none resize-none"
              placeholder={"Basic knowledge of HTML/CSS\nCurrently studying Computer Science\nGood communication skills"} />
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-surface-border flex justify-end">
            <button type="submit" disabled={loading}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-brand-700 to-brand-400 text-white font-bold hover:brightness-110 transition-all disabled:opacity-50">
              {loading ? 'Publishing...' : 'Post Job Opening'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}