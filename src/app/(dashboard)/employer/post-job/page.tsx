'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

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
          // FIXED: was splitting on the literal two-char string "\n" (backslash+n)
          // instead of an actual newline, so requirements never split into a list.
          requirements: requirements.split('\n').map(req => req.trim()).filter(req => req !== ''),
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to post job');
      }

      setSuccess(true);
      setTitle(''); setLocation(''); setStipend(''); setDescription(''); setRequirements('');
      router.refresh();

      setTimeout(() => {
        router.push('/employer/dashboard');
      }, 2000);

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

      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm rounded-2xl p-6 md:p-8">
        {success && (
          <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/50 text-green-600 dark:text-green-400 text-sm flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Job posted successfully! Redirecting to dashboard...
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800/50 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Job Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-gray-900 dark:text-white transition-all outline-none"
                placeholder="e.g. Frontend Developer Intern"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Location</label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-gray-900 dark:text-white transition-all outline-none"
                placeholder="e.g. Lagos, Nigeria"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Work Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-gray-900 dark:text-white transition-all outline-none"
              >
                <option value="On-site">On-site</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Stipend (Monthly)</label>
              <input
                type="text"
                value={stipend}
                onChange={(e) => setStipend(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-gray-900 dark:text-white transition-all outline-none"
                placeholder="e.g. ₦50,000 (Optional)"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Job Description</label>
            <div className="bg-gray-50 dark:bg-gray-950 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 focus-within:border-cyan-500 transition-all [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-gray-200 dark:[&_.ql-toolbar]:border-gray-800 [&_.ql-container]:border-none [&_.ql-editor]:min-h-[150px] [&_.ql-editor]:text-base [&_.ql-editor]:text-gray-900 dark:[&_.ql-editor]:text-white">
              <ReactQuill
                theme="snow"
                value={description}
                onChange={setDescription}
                placeholder="Describe the day-to-day responsibilities..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Requirements (One per line)</label>
            <textarea
              required
              rows={4}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-gray-900 dark:text-white transition-all outline-none resize-none"
              placeholder={"Basic knowledge of HTML/CSS\nCurrently studying Computer Science\nGood communication skills"}
            />
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold hover:shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Publishing...' : 'Post Job Opening'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}