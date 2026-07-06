'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import 'react-quill/dist/quill.snow.css';

// Dynamically import ReactQuill to avoid SSR issues
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
          requirements: requirements.split('\\n').map(req => req.trim()).filter(req => req !== '')
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to post job');
      }

      setSuccess(true);
      // Reset form
      setTitle(''); setLocation(''); setStipend(''); setDescription(''); setRequirements('');
      router.refresh();
      
      // Redirect back to dashboard after 2 seconds
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
        <h1 className="text-3xl font-extrabold tracking-tight">Post a Placement</h1>
        <p className="text-foreground/60 mt-1">Create a new SIWES opening to attract top student talent.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
        {success && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Job posted successfully! Redirecting to dashboard...
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Job Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-cyan-500 focus:bg-transparent transition-all outline-none"
                placeholder="e.g. Frontend Developer Intern"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Location</label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-cyan-500 focus:bg-transparent transition-all outline-none"
                placeholder="e.g. Lagos, Nigeria"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Work Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-cyan-500 focus:bg-transparent transition-all outline-none appearance-none"
              >
                <option value="On-site">On-site</option>
                <option value="Remote">Remote</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Stipend (Monthly)</label>
              <input
                type="text"
                value={stipend}
                onChange={(e) => setStipend(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-cyan-500 focus:bg-transparent transition-all outline-none"
                placeholder="e.g. ₦50,000 (Optional)"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Job Description</label>
            <div className="bg-white/5 dark:bg-white/5 rounded-xl overflow-hidden border border-transparent focus-within:border-cyan-500 transition-all [&_.ql-toolbar]:border-none [&_.ql-toolbar]:border-b [&_.ql-toolbar]:border-white/10 [&_.ql-container]:border-none [&_.ql-editor]:min-h-[150px] [&_.ql-editor]:text-base">
              <ReactQuill 
                theme="snow" 
                value={description} 
                onChange={setDescription} 
                placeholder="Describe the day-to-day responsibilities..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Requirements (One per line)</label>
            <textarea
              required
              rows={4}
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-cyan-500 focus:bg-transparent transition-all outline-none resize-none"
              placeholder="Basic knowledge of HTML/CSS&#10;Currently studying Computer Science&#10;Good communication skills"
            />
          </div>

          <div className="pt-6 border-t border-white/10 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold hover:shadow-[0_4px_20px_rgba(6,182,212,0.4)] transition-all disabled:opacity-50"
            >
              {loading ? 'Publishing...' : 'Post Job Opening'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
