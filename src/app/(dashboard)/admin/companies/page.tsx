'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, ShieldCheck, ShieldX, FileText, Building2, ExternalLink } from 'lucide-react';

type Company = {
  _id: string;
  name: string;
  email: string;
  companyName?: string;
  industry?: string;
  companyDescription?: string;
  cacNumber?: string;
  officialEmail?: string;
  verificationDocumentUrl?: string;
  verificationStatus: 'unsubmitted' | 'pending' | 'approved' | 'rejected';
  verificationRejectionReason?: string;
};

const STATUS_TABS = ['pending', 'approved', 'rejected', 'all'] as const;

export default function AdminCompaniesPage() {
  const [status, setStatus] = useState<(typeof STATUS_TABS)[number]>('pending');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/companies?status=${status}`);
      const data = await res.json();
      setCompanies(data.companies || []);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  async function review(id: string, action: 'approve' | 'reject') {
    let reason: string | undefined;
    if (action === 'reject') {
      reason = window.prompt('Reason for rejection (shown to the company):') || undefined;
      if (reason === undefined) return;
    }
    setActioningId(id);
    try {
      await fetch(`/api/admin/companies/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      await load();
    } finally {
      setActioningId(null);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="font-display font-extrabold text-[26px] tracking-[-0.02em]">Company verification</h1>
        <p className="text-sm text-muted mt-1">Approve legitimate organizations so their opportunities become publicly visible.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setStatus(t)}
            className={`px-4 py-2 rounded-full text-[13px] font-bold capitalize transition-all ${status === t ? 'bg-primary-500 dark:bg-primary-400 text-white' : 'bg-surface-1 border-[1.5px] border-surface-border text-muted'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
      ) : companies.length === 0 ? (
        <EmptyState label={`No ${status === 'all' ? '' : status} companies.`} />
      ) : (
        <div className="space-y-4">
          {companies.map((c) => (
            <div key={c._id} className="p-6 rounded-2xl bg-surface-1 border border-surface-border">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Building2 className="w-5 h-5 text-primary-500 dark:text-primary-400" />
                    <h3 className="font-display font-bold text-base">{c.companyName || c.name}</h3>
                    <StatusBadge status={c.verificationStatus} />
                  </div>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 text-sm">
                    <Detail label="Contact" value={c.name} />
                    <Detail label="Login email" value={c.email} />
                    <Detail label="Official email" value={c.officialEmail} />
                    <Detail label="CAC number" value={c.cacNumber} />
                    <Detail label="Industry" value={c.industry} />
                  </dl>
                  {c.companyDescription && <p className="text-sm text-muted max-w-2xl pt-1">{c.companyDescription}</p>}
                  {c.verificationStatus === 'rejected' && c.verificationRejectionReason && (
                    <p className="text-sm text-error">Rejected: {c.verificationRejectionReason}</p>
                  )}
                  {c.verificationDocumentUrl && (
                    <a href={c.verificationDocumentUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm font-bold text-primary-500 dark:text-primary-400 hover:underline">
                      <FileText className="w-4 h-4" /> View CAC document <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {c.verificationStatus !== 'approved' || status === 'all' ? (
                  <div className="flex gap-2 shrink-0">
                    {c.verificationStatus !== 'approved' && (
                      <button
                        onClick={() => review(c._id, 'approve')}
                        disabled={actioningId === c._id}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-success text-[#032E1A] text-sm font-bold hover:brightness-105 disabled:opacity-50 transition-all"
                      >
                        {actioningId === c._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Approve
                      </button>
                    )}
                    {c.verificationStatus !== 'rejected' && (
                      <button
                        onClick={() => review(c._id, 'reject')}
                        disabled={actioningId === c._id}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-2 border border-surface-border text-error text-sm font-bold disabled:opacity-50 transition-all"
                      >
                        <ShieldX className="w-4 h-4" /> Reject
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <dt className="text-muted">{label}:</dt>
      <dd className="font-medium break-all">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: Company['verificationStatus'] }) {
  const styles: Record<string, string> = {
    pending: 'bg-warning-bg text-warning',
    approved: 'bg-success-bg text-success',
    rejected: 'bg-error-bg text-error',
    unsubmitted: 'bg-surface-2 text-muted',
  };
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold capitalize ${styles[status]}`}>{status}</span>;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="p-14 rounded-3xl bg-surface-1 border border-surface-border text-center flex flex-col items-center">
      <div className="w-16 h-16 rounded-2xl bg-primary-500/10 dark:bg-primary-400/15 flex items-center justify-center mb-5">
        <ShieldCheck className="w-8 h-8 text-primary-500 dark:text-primary-400" />
      </div>
      <h4 className="font-display font-bold text-lg">{label}</h4>
    </div>
  );
}
