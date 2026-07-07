'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function StudentProfile() {
  const router = useRouter();

  const [university, setUniversity] = useState('');
  const [course, setCourse] = useState('');
  const [resumeLink, setResumeLink] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          setUniversity(data.university || '');
          setCourse(data.courseOfStudy || '');
          setResumeLink(data.resumeUrl || '');
        }
      } catch { } finally {
        setInitialLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      let finalResumeLink = resumeLink;

      if (file) {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || 'Failed to upload PDF');
        }
        const uploadData = await uploadRes.json();
        finalResumeLink = uploadData.url;
        setResumeLink(finalResumeLink);
      }

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ university, course, resumeLink: finalResumeLink }),
      });

      if (!res.ok) throw new Error('Failed to update profile');

      setSuccess(true);
      setFile(null);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Edit Profile</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Update your academic details and resume so employers can find you.</p>
      </div>

      <div className="bg-surface-1 border border-surface-border shadow-sm rounded-2xl p-6 md:p-8">
        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-2">
            <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Profile updated successfully! Employers will now see your latest details.
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-800/40 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">University or Institution</label>
            <input
              type="text"
              required
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-surface-2 border border-gray-200 dark:border-surface-border focus:border-brand-400 focus:ring-1 focus:ring-brand-400 text-gray-900 dark:text-white transition-all outline-none"
              placeholder="e.g. University of Lagos"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Course of Study</label>
            <input
              type="text"
              required
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-surface-2 border border-gray-200 dark:border-surface-border focus:border-brand-400 focus:ring-1 focus:ring-brand-400 text-gray-900 dark:text-white transition-all outline-none"
              placeholder="e.g. Computer Science"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Resume / IT Letter (PDF Upload)</label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Upload your resume directly as a PDF, or paste an external link below.</p>
            <div className="flex flex-col gap-3">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-surface-2 border border-gray-200 dark:border-surface-border focus:border-brand-400 focus:ring-1 focus:ring-brand-400 transition-all outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 dark:file:bg-brand-500/10 file:text-brand-600 dark:file:text-brand-300 hover:file:bg-brand-100 dark:hover:file:bg-brand-500/20"
              />
              <div className="flex items-center gap-4">
                <hr className="flex-1 border-gray-200 dark:border-surface-border" />
                <span className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase">Or paste link</span>
                <hr className="flex-1 border-gray-200 dark:border-surface-border" />
              </div>
              <input
                type="url"
                value={resumeLink}
                onChange={(e) => setResumeLink(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-surface-2 border border-gray-200 dark:border-surface-border focus:border-brand-400 focus:ring-1 focus:ring-brand-400 text-gray-900 dark:text-white transition-all outline-none"
                placeholder="https://drive.google.com/file/d/... (Optional)"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-surface-border flex justify-end">
            <button
              type="submit"
              disabled={loading || uploading}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-brand-700 to-brand-400 text-white font-bold hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {(loading || uploading) && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading || uploading ? 'Saving Changes...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}