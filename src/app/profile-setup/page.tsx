'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { DEPARTMENTS } from '@/lib/departments';

const LEVELS = ['300 Level', '400 Level', 'HND II'];
const DURATIONS = ['4 months', '6 months', '12 months'];
const SKILL_OPTIONS = ['React', 'Python', 'SQL', 'Figma', 'Excel', 'Node.js', 'Data Analysis', 'Networking'];
const STATES = ['Lagos', 'Abuja (FCT)', 'Rivers', 'Oyo', 'Kano', 'Any state'];

const STEP_TITLES = ['Academic details', 'SIWES duration', 'Skills', 'Preferred location'];
const STEP_SUBTITLES = [
  "Tell us where you study and what you're studying.",
  'When does your training start, and for how long?',
  "Select the skills you'd like to be matched on.",
  'Where would you like to serve your SIWES?',
];

function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 64 64" aria-hidden>
      <circle cx="22" cy="42" r="10" className="fill-primary-500 dark:fill-primary-400" />
      <circle cx="42" cy="22" r="10" className="fill-primary-500 dark:fill-primary-400" opacity="0.35" />
      <path d="M28 36 L38 28" className="stroke-primary-500 dark:stroke-primary-400" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export default function ProfileSetup() {
  const router = useRouter();
  const { status } = useSession();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [university, setUniversity] = useState('');
  const [course, setCourse] = useState('');
  const [level, setLevel] = useState(LEVELS[0]);
  const [startDate, setStartDate] = useState('');
  const [duration, setDuration] = useState('6 months');
  const [skills, setSkills] = useState<string[]>([]);
  const [preferredState, setPreferredState] = useState(STATES[0]);

  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/profile');
        if (!res.ok) return;
        const data = await res.json();
        if (data.university) setUniversity(data.university);
        if (data.courseOfStudy) setCourse(data.courseOfStudy);
        if (data.level) setLevel(data.level);
        if (data.siwesDuration) setDuration(data.siwesDuration);
        if (data.preferredState) setPreferredState(data.preferredState);
        if (Array.isArray(data.skills) && data.skills.length) setSkills(data.skills);
        if (data.siwesStartDate) setStartDate(new Date(data.siwesStartDate).toISOString().slice(0, 10));
      } catch {
        // Prefill is best-effort; the wizard still works starting from blank fields.
      }
    })();
  }, []);

  const toggleSkill = (s: string) => {
    setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  const handleNext = async () => {
    if (step < 4) {
      setStep((s) => s + 1);
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          university,
          course,
          level,
          skills,
          siwesStartDate: startDate || undefined,
          siwesDuration: duration,
          preferredState,
        }),
      });
      if (!res.ok) throw new Error('Could not save your profile. Please try again.');
      router.push('/student/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile. Please try again.');
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center px-6 py-14">
      <div className="w-full max-w-[560px] flex items-center justify-between mb-9">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="font-display font-extrabold text-[16px]">SIWES Finder</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[560px]">
        <div className="flex items-center gap-2 mb-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className={`flex-1 h-1.5 rounded-full transition-colors ${n <= step ? 'bg-primary-500 dark:bg-primary-400' : 'bg-surface-border'}`} />
          ))}
        </div>
        <div className="text-[12.5px] font-semibold text-muted mb-7">Step {step} of 4 — {STEP_TITLES[step - 1]}</div>

        <div className="bg-surface-1 rounded-[20px] border border-surface-border shadow-sm p-9">
          <div className="font-display font-extrabold text-[22px] tracking-[-0.02em] mb-1.5">{STEP_TITLES[step - 1]}</div>
          <div className="text-sm text-muted mb-7">{STEP_SUBTITLES[step - 1]}</div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-error-bg border border-error/20 text-error text-sm font-medium text-center">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <Field label="School">
                <input value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="University of Lagos" className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-[16px] focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 transition-all" />
              </Field>
              <Field label="Department / course of study">
                <select value={course} onChange={(e) => setCourse(e.target.value)} className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-[16px] focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 transition-all">
                  <option value="" disabled>Select your department</option>
                  {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <p className="text-[12.5px] text-muted mt-1.5">We use this to show you opportunities from your own department by default.</p>
              </Field>
              <Field label="Level">
                <select value={level} onChange={(e) => setLevel(e.target.value)} className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-[16px] focus:outline-none focus:border-primary-500 transition-all">
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Start date">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-[16px] focus:outline-none focus:border-primary-500 transition-all" />
              </Field>
              <Field label="Duration">
                <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-[16px] focus:outline-none focus:border-primary-500 transition-all">
                  {DURATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-wrap gap-2.5">
              {SKILL_OPTIONS.map((s) => {
                const selected = skills.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => toggleSkill(s)}
                    className={`px-4 py-2.5 rounded-full text-[13.5px] font-semibold border-[1.5px] transition-colors ${
                      selected
                        ? 'border-primary-500 bg-primary-500/10 dark:bg-primary-400/15 text-primary-500 dark:text-primary-400'
                        : 'border-surface-border bg-surface-1 text-foreground'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          )}

          {step === 4 && (
            <div>
              <Field label="Preferred state">
                <select value={preferredState} onChange={(e) => setPreferredState(e.target.value)} className="w-full px-3.5 py-3 rounded-lg border-[1.5px] border-surface-border bg-surface-1 text-[16px] focus:outline-none focus:border-primary-500 transition-all mb-5">
                  {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <div className="flex items-center gap-2.5 p-3.5 bg-accent-500/10 rounded-[10px]">
                <div className="w-2 h-2 rounded-full bg-accent-500 shrink-0" />
                <div className="text-[13px]">Remote-friendly opportunities are included regardless of state.</div>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={handleBack}
              className={`px-6 py-3 text-[14.5px] font-bold ${step === 1 ? 'invisible' : ''}`}
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={saving}
              className="bg-primary-500 dark:bg-primary-400 text-white px-6 py-3 rounded-lg text-[14.5px] font-bold shadow-lg shadow-primary-900/20 hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {step === 4 ? 'Finish & go to dashboard' : 'Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  // Nested label (rather than a sibling label + unlinked input/select)
  // so the control is programmatically associated with its label -- both
  // for screen readers and for `getByLabel` in the E2E suite.
  return (
    <label className="block">
      <span className="block text-[13px] font-semibold mb-1.5">{label}</span>
      {children}
    </label>
  );
}
