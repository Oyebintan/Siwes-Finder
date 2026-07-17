'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Loader2, X, Plus } from 'lucide-react';
import { DEPARTMENTS } from '@/lib/departments';

const DURATIONS = ['4 months', '6 months', '12 months'];
const STEP_TITLES = ['Basics', 'Role details', 'Application & publish'];
const STEP_SUBTITLES = [
  'Where and how long is this placement?',
  'Describe the placement so students can evaluate the fit.',
  'Choose how students apply, then review and publish.',
];

export default function EmployerPostJob() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [type, setType] = useState<'On-site' | 'Remote' | 'Hybrid'>('On-site');
  const [duration, setDuration] = useState('6 months');
  const [department, setDepartment] = useState('');
  const [stipend, setStipend] = useState('');
  const [description, setDescription] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');

  const [applicationMethod, setApplicationMethod] = useState<'platform' | 'email' | 'external'>('platform');
  const [applicationEmail, setApplicationEmail] = useState('');
  const [applicationUrl, setApplicationUrl] = useState('');
  const [applicationDeadline, setApplicationDeadline] = useState('');
  const [maxApplicants, setMaxApplicants] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills((prev) => [...prev, s]);
    setSkillInput('');
  };

  const canContinueStep1 = title.trim() && location.trim() && department;
  const canContinueStep2 = description.trim() && skills.length > 0;

  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  const handleContinue = () => {
    setError('');
    if (step === 1 && !canContinueStep1) { setError('Please fill in the opportunity title, location, and department.'); return; }
    if (step === 2 && !canContinueStep2) { setError('Please add a description and at least one required skill.'); return; }
    setStep((s) => Math.min(3, s + 1));
  };

  const handlePublish = async () => {
    setError('');
    if (applicationMethod === 'email' && !applicationEmail.trim()) { setError('Please provide an application email.'); return; }
    if (applicationMethod === 'external' && !applicationUrl.trim()) { setError('Please provide an application URL.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, location, type, duration, department,
          stipend: stipend || 'Unpaid',
          description,
          requirements: skills,
          applicationMethod, applicationEmail, applicationUrl,
          applicationDeadline: applicationDeadline || undefined,
          maxApplicants: maxApplicants || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to post job');
      }

      router.push('/employer/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post job');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full flex flex-col items-center py-6">
      <div className="w-full max-w-[640px]">
        <div className="flex items-center justify-between mb-6">
          <Link href="/employer/dashboard" className="text-[13.5px] font-semibold text-muted">← Back to dashboard</Link>
        </div>

        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`flex-1 h-1.5 rounded-full transition-colors ${n <= step ? 'bg-accent-500' : 'bg-surface-border'}`} />
          ))}
        </div>
        <div className="text-[12.5px] font-semibold text-muted mb-7">Step {step} of 3 — {STEP_TITLES[step - 1]}</div>

        <div className="bg-surface-1 rounded-[20px] border border-surface-border shadow-sm p-9">
          <div className="font-display font-extrabold text-[22px] tracking-[-0.02em] mb-1.5">{STEP_TITLES[step - 1]}</div>
          <div className="text-sm text-muted mb-7">{STEP_SUBTITLES[step - 1]}</div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-error-bg border border-error/20 text-error text-sm font-medium text-center">{error}</div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <Field label="Opportunity title">
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Frontend Engineering Intern" className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-[16px] focus:outline-none focus:border-accent-500 transition-all" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Location">
                  <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Lagos, Nigeria" className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-[16px] focus:outline-none focus:border-accent-500 transition-all" />
                </Field>
                <Field label="Work type">
                  <select value={type} onChange={(e) => setType(e.target.value as 'On-site' | 'Remote' | 'Hybrid')} className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-[16px] focus:outline-none focus:border-accent-500 transition-all">
                    <option value="On-site">On-site</option>
                    <option value="Remote">Remote</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Duration">
                  <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-[16px] focus:outline-none focus:border-accent-500 transition-all">
                    {DURATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
                <Field label="Stipend (optional)">
                  <input value={stipend} onChange={(e) => setStipend(e.target.value)} placeholder="₦50,000" className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-[16px] focus:outline-none focus:border-accent-500 transition-all" />
                </Field>
              </div>
              <Field label="Department">
                <select value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-[16px] focus:outline-none focus:border-accent-500 transition-all">
                  <option value="" disabled>Select the department this opportunity is for</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <p className="text-[12.5px] text-muted mt-1.5">e.g. &ldquo;Computer Science&rdquo; for a Software Engineering role. Students mainly see opportunities from their own department by default.</p>
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <Field label="Description">
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="What will the intern work on?" className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-[16px] focus:outline-none focus:border-accent-500 transition-all resize-none" />
              </Field>
              <div>
                <label className="block text-[13px] font-semibold mb-1.5">Required skills</label>
                <div className="flex flex-wrap gap-2.5 items-center">
                  {skills.map((s) => (
                    <button key={s} type="button" onClick={() => setSkills((prev) => prev.filter((x) => x !== s))} className="px-4 py-2 rounded-full text-[13px] font-semibold bg-accent-500/10 text-accent-500 flex items-center gap-1.5">
                      {s} <X className="w-3 h-3" />
                    </button>
                  ))}
                  <div className="flex items-center gap-1.5">
                    <input
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                      placeholder="e.g. React"
                      className="px-3 py-1.5 rounded-full text-[16px] border-[1.5px] border-dashed border-surface-border bg-surface-1 w-[130px] focus:outline-none focus:border-accent-500"
                    />
                    <button type="button" onClick={addSkill} className="w-7 h-7 rounded-full border-[1.5px] border-dashed border-surface-border flex items-center justify-center text-muted">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <Field label="How should students apply?">
                <select value={applicationMethod} onChange={(e) => setApplicationMethod(e.target.value as 'platform' | 'email' | 'external')} className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-[16px] focus:outline-none focus:border-accent-500 transition-all">
                  <option value="platform">On this platform (students apply here)</option>
                  <option value="email">By email (students email you)</option>
                  <option value="external">External link (redirect to your site)</option>
                </select>
              </Field>
              {applicationMethod === 'email' && (
                <Field label="Application email">
                  <input type="email" value={applicationEmail} onChange={(e) => setApplicationEmail(e.target.value)} placeholder="careers@company.com" className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-[16px] focus:outline-none focus:border-accent-500 transition-all" />
                </Field>
              )}
              {applicationMethod === 'external' && (
                <Field label="External application URL">
                  <input type="url" value={applicationUrl} onChange={(e) => setApplicationUrl(e.target.value)} placeholder="https://company.com/careers/apply" className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-[16px] focus:outline-none focus:border-accent-500 transition-all" />
                </Field>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Field label="Application deadline (optional)">
                  <input type="date" value={applicationDeadline} onChange={(e) => setApplicationDeadline(e.target.value)} className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-[16px] focus:outline-none focus:border-accent-500 transition-all" />
                </Field>
                <Field label="Max applicants (optional)">
                  <input type="number" min="1" value={maxApplicants} onChange={(e) => setMaxApplicants(e.target.value)} placeholder="e.g. 20" className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-[16px] focus:outline-none focus:border-accent-500 transition-all" />
                </Field>
              </div>
              <p className="text-[12.5px] text-muted -mt-2.5">Leave either blank for no limit. Once the deadline passes or the applicant cap is reached, the listing closes automatically.</p>

              <div className="bg-background rounded-xl p-4 space-y-1.5 text-[13px]">
                <div className="font-bold text-sm mb-1">{title || 'Untitled opportunity'}</div>
                <div className="text-muted">{location} · {type} · {duration}</div>
                {department && <div className="text-muted">Department: {department}</div>}
                {skills.length > 0 && <div className="text-muted">Skills: {skills.join(', ')}</div>}
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            <button type="button" onClick={handleBack} className={`px-6 py-3 text-[14.5px] font-bold ${step === 1 ? 'invisible' : ''}`}>Back</button>
            {step < 3 ? (
              <button type="button" onClick={handleContinue} className="bg-accent-500 text-[#032E1A] px-6 py-3 rounded-lg text-[14.5px] font-bold shadow-lg shadow-accent-900/20 hover:brightness-105 transition-all">Continue</button>
            ) : (
              <button type="button" onClick={handlePublish} disabled={loading} className="bg-accent-500 text-[#032E1A] px-6 py-3 rounded-lg text-[14.5px] font-bold shadow-lg shadow-accent-900/20 hover:brightness-105 disabled:opacity-50 transition-all flex items-center gap-2">
                {loading && <Loader2 className="w-4 h-4 animate-spin" />} Review & publish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[13px] font-semibold mb-1.5">{label}</label>
      {children}
    </div>
  );
}
