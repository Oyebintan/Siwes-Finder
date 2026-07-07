'use client';

import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, Clock, ShieldX, UploadCloud, FileText } from 'lucide-react';

type Verification = {
  companyName?: string;
  industry?: string;
  companyDescription?: string;
  cacNumber?: string;
  officialEmail?: string;
  verificationDocumentUrl?: string;
  verificationStatus: 'unsubmitted' | 'pending' | 'approved' | 'rejected';
  verificationRejectionReason?: string;
};

export default function EmployerVerificationPage() {
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
    if (!docUrl) { setError('Please upload your CAC registration document (PDF).'); return; }
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

  if (loading) return <div className="flex justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-accent-500" /></div>;

  const status = data?.verificationStatus || 'unsubmitted';

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Company Verification</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Verified companies can post opportunities that students see. Submit your CAC details for admin review.</p>
      </div>

      {status === 'approved' && (
        <Banner tone="success" icon={ShieldCheck} title="Your company is verified" desc="Your opportunities are publicly visible to students." />
      )}
      {status === 'pending' && (
        <Banner tone="pending" icon={Clock} title="Verification under review" desc="An admin is reviewing your submission. You'll be able to post once approved." />
      )}
      {status === 'rejected' && (
        <Banner tone="error" icon={ShieldX} title="Verification rejected" desc={data?.verificationRejectionReason || 'Please review your details and resubmit.'} />
      )}

      {status !== 'approved' && status !== 'pending' && (
        <form onSubmit={submit} className="p-6 sm:p-8 rounded-3xl bg-surface-1 border border-surface-border shadow-sm space-y-5">
          <Field label="Company name" value={form.companyName} onChange={(v) => setForm({ ...form, companyName: v })} required />
          <div className="grid sm:grid-cols-2 gap-5">
            <Field label="CAC registration number" value={form.cacNumber} onChange={(v) => setForm({ ...form, cacNumber: v })} required />
            <Field label="Official company email" type="email" value={form.officialEmail} onChange={(v) => setForm({ ...form, officialEmail: v })} required />
          </div>
          <Field label="Industry" value={form.industry} onChange={(v) => setForm({ ...form, industry: v })} />
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">About the company</label>
            <textarea
              value={form.companyDescription}
              onChange={(e) => setForm({ ...form, companyDescription: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-0 border border-surface-border focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">CAC registration document (PDF)</label>
            <label className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-0 border border-dashed border-surface-border cursor-pointer hover:border-accent-400/60 transition-all">
              {uploading ? <Loader2 className="w-5 h-5 animate-spin text-accent-500" /> : docUrl ? <FileText className="w-5 h-5 text-accent-600 dark:text-accent-300" /> : <UploadCloud className="w-5 h-5 text-gray-400" />}
              <span className="text-sm text-gray-600 dark:text-gray-300">{docUrl ? 'Document uploaded — choose another to replace' : 'Click to upload a PDF (max 5 MB)'}</span>
              <input type="file" accept="application/pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
            </label>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting || uploading}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-accent-700 to-accent-400 text-white font-bold shadow-lg shadow-accent-900/30 hover:brightness-110 disabled:opacity-50 transition-all"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {status === 'rejected' ? 'Resubmit for review' : 'Submit for verification'}
          </button>
        </form>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">{label}{required && <span className="text-red-500"> *</span>}</label>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl bg-surface-0 border border-surface-border focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 transition-all"
      />
    </div>
  );
}

function Banner({ tone, icon: Icon, title, desc }: { tone: 'success' | 'pending' | 'error'; icon: any; title: string; desc: string }) {
  const tones = {
    success: 'bg-accent-100 dark:bg-accent-500/10 text-accent-700 dark:text-accent-300 border-accent-400/40',
    pending: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-400/40',
    error: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-400/40',
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
