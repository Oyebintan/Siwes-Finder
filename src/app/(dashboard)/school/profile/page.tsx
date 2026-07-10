'use client';

import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, Clock, ShieldX, UploadCloud, FileText, type LucideIcon } from 'lucide-react';
import AvatarUpload from '@/components/AvatarUpload';

type Verification = {
  companyName?: string;
  avatarUrl?: string;
  industry?: string;
  companyDescription?: string;
  cacNumber?: string;
  officialEmail?: string;
  verificationDocumentUrl?: string;
  verificationStatus: 'unsubmitted' | 'pending' | 'approved' | 'rejected';
  verificationRejectionReason?: string;
};

// Institution counterpart of the employer Company Verification page. Same
// API (/api/companies/verification, shared across employer/school), just
// school-appropriate copy and field labels.
export default function SchoolProfilePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Verification | null>(null);

  const [form, setForm] = useState({ companyName: '', industry: '', companyDescription: '', cacNumber: '', officialEmail: '' });
  const [docUrl, setDocUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/companies/verification');
        const json = await res.json();
        const v: Verification = json.verification || { verificationStatus: 'unsubmitted' };
        setData(v);
        setForm({
          companyName: v.companyName || '',
          industry: v.industry || '',
          companyDescription: v.companyDescription || '',
          cacNumber: v.cacNumber || '',
          officialEmail: v.officialEmail || '',
        });
        setDocUrl(v.verificationDocumentUrl || '');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleUpload(file: File) {
    setError('');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', 'verification');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Upload failed.'); return; }
      setDocUrl(json.url);
    } finally {
      setUploading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!docUrl) { setError('Please upload your accreditation document (PDF).'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/companies/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, verificationDocumentUrl: docUrl }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error || 'Submission failed.'); return; }
      setData((d) => ({ ...(d as Verification), ...form, verificationDocumentUrl: docUrl, verificationStatus: 'pending' }));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>;

  const status = data?.verificationStatus || 'unsubmitted';

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in-up">
      <div className="flex items-center gap-5 flex-wrap">
        <AvatarUpload name={form.companyName || 'Sc'} avatarUrl={data?.avatarUrl} shape="square" size={72} />
        <div className="flex-1 min-w-[240px]">
          <h1 className="font-display font-extrabold text-[26px] tracking-[-0.02em]">Institution profile</h1>
          <p className="text-sm text-muted mt-1">Verified institutions are shown to students and companies. Click the tile to upload your school crest/logo.</p>
        </div>
      </div>

      {status === 'approved' && (
        <Banner tone="success" icon={ShieldCheck} title="Your institution is verified" desc="You have full access to your students' placement and logbook data." />
      )}
      {status === 'pending' && (
        <Banner tone="pending" icon={Clock} title="Verification under review" desc="An admin is reviewing your submission. Student records unlock once approved." />
      )}
      {status === 'rejected' && (
        <Banner tone="error" icon={ShieldX} title="Verification rejected" desc={data?.verificationRejectionReason || 'Please review your details and resubmit.'} />
      )}
      {status === 'unsubmitted' && (
        <Banner tone="pending" icon={Clock} title="Add your institution details" desc="Submit the form below so an admin can verify your school." />
      )}

      {status !== 'approved' && status !== 'pending' && (
        <form onSubmit={submit} className="p-6 sm:p-8 rounded-3xl bg-surface-1 border border-surface-border shadow-sm space-y-5">
          <Field label="Institution name" value={form.companyName} onChange={(v) => setForm({ ...form, companyName: v })} required />
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="Accreditation / RC number" value={form.cacNumber} onChange={(v) => setForm({ ...form, cacNumber: v })} required />
            <Field label="Official institution email" type="email" value={form.officialEmail} onChange={(v) => setForm({ ...form, officialEmail: v })} required />
          </div>
          <Field label="Institution type" value={form.industry} onChange={(v) => setForm({ ...form, industry: v })} placeholder="University, Polytechnic, College of Education…" />
          <div>
            <label className="block text-sm font-bold mb-1.5">About the institution</label>
            <textarea
              value={form.companyDescription}
              onChange={(e) => setForm({ ...form, companyDescription: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all text-[16px]"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1.5">Accreditation document (PDF)</label>
            <label className="flex items-center gap-3 px-4 py-3 rounded-xl bg-background border border-dashed border-surface-border cursor-pointer hover:border-primary-400/60 transition-all">
              {uploading ? <Loader2 className="w-5 h-5 animate-spin text-primary-500" /> : docUrl ? <FileText className="w-5 h-5 text-primary-500 dark:text-primary-400" /> : <UploadCloud className="w-5 h-5 text-muted" />}
              <span className="text-sm text-muted">{docUrl ? 'Document uploaded — choose another to replace' : 'Click to upload a PDF (max 5 MB)'}</span>
              <input type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
            </label>
          </div>

          {error && <p className="text-sm text-error">{error}</p>}

          <button
            type="submit"
            disabled={submitting || uploading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-500 dark:bg-primary-400 text-white font-bold shadow-lg hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {status === 'rejected' ? 'Resubmit for review' : 'Submit for verification'}
          </button>
        </form>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required, placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="block text-sm font-bold mb-1.5">{label}{required && <span className="text-error"> *</span>}</label>
      <input
        type={type}
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl bg-background border border-surface-border focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all text-[16px]"
      />
    </div>
  );
}

function Banner({ tone, icon: Icon, title, desc }: { tone: 'success' | 'pending' | 'error'; icon: LucideIcon; title: string; desc: string }) {
  const tones = {
    success: 'bg-success-bg text-success border-success/30',
    pending: 'bg-warning-bg text-warning border-warning/30',
    error: 'bg-error-bg text-error border-error/30',
  };
  return (
    <div className={`flex items-start gap-3 p-5 rounded-2xl border ${tones[tone]}`}>
      <Icon className="w-6 h-6 shrink-0 mt-0.5" />
      <div>
        <h3 className="font-bold">{title}</h3>
        <p className="text-sm opacity-90 mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
