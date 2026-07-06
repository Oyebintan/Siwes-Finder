'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function StudentProfile() {
  const router = useRouter();
  const { data: session } = useSession();

  const [university, setUniversity] = useState('');
  const [course, setCourse] = useState('');
  const [resumeLink, setResumeLink] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      let finalResumeLink = resumeLink;

      // Handle file upload if a file is selected
      if (file) {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        
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

      if (!res.ok) {
        throw new Error('Failed to update profile');
      }

      setSuccess(true);
      setFile(null); // Clear selected file after success
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Edit Profile</h1>
        <p className="text-foreground/60 mt-1">Update your academic details and resume so employers can find you.</p>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8">
        {success && (
          <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-sm flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Profile updated successfully! Employers will now see your latest details.
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold">University or Institution</label>
            <input
              type="text"
              required
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-blue-500 focus:bg-transparent transition-all outline-none"
              placeholder="e.g. University of Lagos"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Course of Study</label>
            <input
              type="text"
              required
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-blue-500 focus:bg-transparent transition-all outline-none"
              placeholder="e.g. Computer Science"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">Resume / IT Letter (PDF Upload)</label>
            <p className="text-xs text-foreground/50 mb-2">Upload your resume directly as a PDF, or paste an external link below.</p>
            
            <div className="flex flex-col gap-3">
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-blue-500 focus:bg-transparent transition-all outline-none file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-500/10 file:text-blue-500 hover:file:bg-blue-500/20"
              />
              <div className="flex items-center gap-4">
                <hr className="flex-1 border-white/10" />
                <span className="text-xs text-foreground/40 font-bold uppercase">OR PASTE LINK</span>
                <hr className="flex-1 border-white/10" />
              </div>
              <input
                type="url"
                value={resumeLink}
                onChange={(e) => setResumeLink(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-black/5 dark:bg-white/5 border border-transparent focus:border-blue-500 focus:bg-transparent transition-all outline-none"
                placeholder="https://drive.google.com/file/d/... (Optional)"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-end">
            <button
              type="submit"
              disabled={loading || uploading}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold hover:shadow-[0_4px_20px_rgba(37,99,235,0.4)] transition-all disabled:opacity-50"
            >
              {loading || uploading ? 'Saving Changes...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
