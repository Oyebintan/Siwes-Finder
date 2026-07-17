'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, FileText, UploadCloud, X, Plus } from 'lucide-react';
import AvatarUpload from '@/components/AvatarUpload';
import { DEPARTMENTS } from '@/lib/departments';

const SKILL_OPTIONS = ['React', 'Python', 'SQL', 'Figma', 'Excel', 'Node.js', 'Data Analysis', 'Networking'];
const STATES = ['Lagos', 'Abuja (FCT)', 'Rivers', 'Oyo', 'Kano', 'Any state'];

export default function StudentProfile() {
  const { data: session } = useSession();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [university, setUniversity] = useState('');
  const [faculty, setFaculty] = useState('');
  const [course, setCourse] = useState('');
  const [level, setLevel] = useState('');
  const [preferredState, setPreferredState] = useState(STATES[0]);
  const [skills, setSkills] = useState<string[]>([]);
  const [skillMenuOpen, setSkillMenuOpen] = useState(false);
  const [resumeUrl, setResumeUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          setName(data.name || session?.user?.name || '');
          setPhone(data.phone || '');
          setAvatarUrl(data.avatarUrl || '');
          setUniversity(data.university || '');
          setFaculty(data.faculty || '');
          setCourse(data.courseOfStudy || '');
          setLevel(data.level || '');
          setPreferredState(data.preferredState || STATES[0]);
          setSkills(Array.isArray(data.skills) ? data.skills : []);
          setResumeUrl(data.resumeUrl || '');
        }
      } catch {} finally {
        setInitialLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasAcademic = Boolean(university && course);
  const hasResume = Boolean(resumeUrl || file);
  const hasSkills = skills.length > 0;
  const hasState = Boolean(preferredState);
  const strength = [hasAcademic, hasResume, hasSkills, hasState].filter(Boolean).length * 25;

  const toggleSkill = (s: string) => {
    setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      let finalResumeUrl = resumeUrl;

      if (file) {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', 'resume');
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        if (!uploadRes.ok) {
          const errData = await uploadRes.json();
          throw new Error(errData.error || 'Failed to upload PDF');
        }
        const uploadData = await uploadRes.json();
        finalResumeUrl = uploadData.url;
        setResumeUrl(finalResumeUrl);
        setFile(null);
      }

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, phone, university, faculty, course: course, level, preferredState, skills, resumeLink: finalResumeUrl,
        }),
      });
      if (!res.ok) throw new Error('Failed to update profile');

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  if (initialLoading) {
    return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;
  }

  return (
    <form onSubmit={handleSave} className="max-w-[900px] mx-auto space-y-5 animate-fade-in-up">
      <h1 className="font-display font-extrabold text-[26px] tracking-[-0.02em]">Your profile</h1>

      {success && (
        <div className="p-3.5 rounded-xl bg-success-bg border border-success/20 text-success text-sm font-medium text-center">
          Profile updated successfully.
        </div>
      )}
      {error && (
        <div className="p-3.5 rounded-xl bg-error-bg border border-error/20 text-error text-sm font-medium text-center">
          {error}
        </div>
      )}

      {/* Summary card */}
      <div className="bg-surface-1 rounded-2xl border border-surface-border p-7 flex items-center gap-5 flex-wrap">
        <AvatarUpload name={name} avatarUrl={avatarUrl} onUploaded={setAvatarUrl} />

        <div className="flex-1 min-w-[180px]">
          <div className="font-display font-bold text-lg">{name || 'Your name'}</div>
          <div className="text-[13.5px] text-muted mt-0.5">
            {[course, university, level].filter(Boolean).join(' · ') || 'Complete your academic details below'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted mb-1">Profile strength</div>
          <div className="font-display font-extrabold text-lg text-accent-500">{strength}%</div>
        </div>
      </div>

      {/* Personal details */}
      <div className="bg-surface-1 rounded-2xl border border-surface-border p-7">
        <div className="font-display font-bold text-[15px] mb-[18px]">Personal details</div>
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          <FieldGroup label="Full name">
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3.5 py-[11px] rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-[16px] focus:outline-none focus:border-primary-500" />
          </FieldGroup>
          <FieldGroup label="Email">
            <input value={session?.user?.email || ''} disabled className="w-full px-3.5 py-[11px] rounded-lg border-[1.5px] border-surface-border bg-surface-2 text-sm text-muted cursor-not-allowed" />
          </FieldGroup>
          <FieldGroup label="Phone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 800 000 0000" className="w-full px-3.5 py-[11px] rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-[16px] focus:outline-none focus:border-primary-500" />
          </FieldGroup>
          <FieldGroup label="Preferred state">
            <select value={preferredState} onChange={(e) => setPreferredState(e.target.value)} className="w-full px-3.5 py-[11px] rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-[16px] focus:outline-none focus:border-primary-500">
              {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="University / Institution">
            <input value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="University of Lagos" className="w-full px-3.5 py-[11px] rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-[16px] focus:outline-none focus:border-primary-500" />
          </FieldGroup>
          <FieldGroup label="Faculty">
            <input value={faculty} onChange={(e) => setFaculty(e.target.value)} placeholder="Faculty of Science" className="w-full px-3.5 py-[11px] rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-[16px] focus:outline-none focus:border-primary-500" />
          </FieldGroup>
          <FieldGroup label="Department / course of study">
            <select value={course} onChange={(e) => setCourse(e.target.value)} className="w-full px-3.5 py-[11px] rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-[16px] focus:outline-none focus:border-primary-500">
              <option value="" disabled>Select your department</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </FieldGroup>
        </div>
      </div>

      {/* Skills */}
      <div className="bg-surface-1 rounded-2xl border border-surface-border p-7">
        <div className="font-display font-bold text-[15px] mb-3.5">Skills</div>
        <div className="flex flex-wrap gap-2.5">
          {skills.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleSkill(s)}
              className="px-4 py-2 rounded-full text-[13px] font-semibold bg-primary-500/10 dark:bg-primary-400/15 text-primary-500 dark:text-primary-400 flex items-center gap-1.5"
            >
              {s} <X className="w-3 h-3" />
            </button>
          ))}
          <div className="relative">
            <button
              type="button"
              onClick={() => setSkillMenuOpen((v) => !v)}
              className="px-4 py-2 rounded-full text-[13px] font-bold border-[1.5px] border-dashed border-surface-border text-muted flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add skill
            </button>
            {skillMenuOpen && (
              <div className="absolute z-10 top-full left-0 mt-2 bg-surface-1 border border-surface-border rounded-xl shadow-lg p-2 flex flex-col gap-0.5 min-w-[160px]">
                {SKILL_OPTIONS.filter((s) => !skills.includes(s)).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => { toggleSkill(s); setSkillMenuOpen(false); }}
                    className="text-left px-3 py-2 rounded-lg text-sm hover:bg-surface-2"
                  >
                    {s}
                  </button>
                ))}
                {SKILL_OPTIONS.filter((s) => !skills.includes(s)).length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted">All skills added</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resume */}
      <div className="bg-surface-1 rounded-2xl border border-surface-border p-7">
        <div className="font-display font-bold text-[15px] mb-3.5">Resume</div>
        <label className="block border-[1.5px] border-dashed border-surface-border rounded-xl p-7 text-center cursor-pointer hover:border-primary-500/50 transition-colors">
          {file || resumeUrl ? (
            <FileText className="w-6 h-6 mx-auto mb-2 text-primary-500 dark:text-primary-400" />
          ) : (
            <UploadCloud className="w-6 h-6 mx-auto mb-2 text-muted" />
          )}
          <div className="text-[13.5px] font-semibold mb-1">
            {file ? file.name : resumeUrl ? 'Resume uploaded — click to replace' : 'No resume uploaded yet'}
          </div>
          <div className="text-xs text-muted mb-4">PDF, up to 5MB.</div>
          <span className="inline-block bg-primary-500 dark:bg-primary-400 text-white px-5 py-2.5 rounded-lg text-[13.5px] font-bold">
            {resumeUrl ? 'Replace resume' : 'Upload resume'}
          </span>
          <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || uploading}
          className="px-7 py-3 rounded-xl bg-primary-500 dark:bg-primary-400 text-white font-bold hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2"
        >
          {(saving || uploading) && <Loader2 className="w-4 h-4 animate-spin" />}
          {uploading ? 'Uploading…' : saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12.5px] font-semibold text-muted mb-1.5">{label}</label>
      {children}
    </div>
  );
}
