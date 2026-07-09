'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, Trash2, Users, ShieldPlus } from 'lucide-react';

type ManagedUser = {
  _id: string;
  name: string;
  email: string;
  role: string;
  companyName?: string;
  university?: string;
  verificationStatus?: string;
  createdAt: string;
};

const ROLE_TABS = ['all', 'student', 'employer', 'admin', 'super_admin', 'unassigned'] as const;

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === 'super_admin';
  const [role, setRole] = useState<(typeof ROLE_TABS)[number]>('all');
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [promoteEmail, setPromoteEmail] = useState('');
  const [promoteRole, setPromoteRole] = useState<'admin' | 'super_admin'>('admin');
  const [promoting, setPromoting] = useState(false);
  const [promoteMessage, setPromoteMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (role !== 'all') params.set('role', role);
      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
    } finally {
      setLoading(false);
    }
  }, [role, page]);

  // `load` sets loading state before fetching; that's the intended fetch-on-mount/dependency-change pattern.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  async function promoteUser(e: React.FormEvent) {
    e.preventDefault();
    setPromoting(true);
    setPromoteMessage(null);
    try {
      const res = await fetch('/api/admin/super-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: promoteEmail, role: promoteRole }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPromoteMessage({ type: 'error', text: data.error || 'Could not promote that user.' });
        return;
      }
      setPromoteMessage({ type: 'success', text: data.message });
      setPromoteEmail('');
      await load();
    } finally {
      setPromoting(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Delete ${name}? This also removes their jobs/applications and cannot be undone.`)) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) await load();
      else alert((await res.json()).error || 'Could not delete user.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      <div>
        <h1 className="font-display font-extrabold text-[26px] tracking-[-0.02em]">User management</h1>
        <p className="text-sm text-muted mt-1">Browse and remove accounts across the platform.</p>
      </div>

      {isSuperAdmin && (
        <div className="p-5 rounded-2xl bg-surface-1 border border-surface-border">
          <div className="flex items-center gap-2 mb-3">
            <ShieldPlus className="w-5 h-5 text-primary-500 dark:text-primary-400" />
            <div className="font-display font-bold text-[15px]">Add an admin or super admin</div>
          </div>
          <p className="text-[13px] text-muted mb-3">Promote an existing account by email. They need an account already (any role) before you can promote them.</p>
          <form onSubmit={promoteUser} className="flex flex-wrap gap-2">
            <input
              type="email"
              required
              value={promoteEmail}
              onChange={(e) => setPromoteEmail(e.target.value)}
              placeholder="someone@example.com"
              className="flex-1 min-w-[220px] px-3.5 py-2.5 rounded-lg border-[1.5px] border-surface-border bg-background text-[16px] focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 transition-all"
            />
            <select
              value={promoteRole}
              onChange={(e) => setPromoteRole(e.target.value as 'admin' | 'super_admin')}
              className="px-3.5 py-2.5 rounded-lg border-[1.5px] border-surface-border bg-background text-[16px] focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 transition-all"
            >
              <option value="admin">Admin</option>
              <option value="super_admin">Super admin</option>
            </select>
            <button
              type="submit"
              disabled={promoting}
              className="px-5 py-2.5 rounded-lg bg-primary-500 dark:bg-primary-400 text-white text-sm font-bold hover:brightness-110 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {promoting && <Loader2 className="w-4 h-4 animate-spin" />}
              Promote
            </button>
          </form>
          {promoteMessage && (
            <p className={`text-[13px] mt-2.5 ${promoteMessage.type === 'success' ? 'text-success' : 'text-error'}`}>
              {promoteMessage.text}
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {ROLE_TABS.map((t) => (
          <button
            key={t}
            onClick={() => { setRole(t); setPage(1); }}
            className={`px-4 py-2 rounded-full text-[13px] font-bold capitalize transition-all ${role === t ? 'bg-primary-500 dark:bg-primary-400 text-white' : 'bg-surface-1 border-[1.5px] border-surface-border text-muted'}`}
          >
            {t.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary-500" /></div>
      ) : users.length === 0 ? (
        <div className="p-14 rounded-3xl bg-surface-1 border border-surface-border text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 dark:bg-primary-400/15 flex items-center justify-center mb-5">
            <Users className="w-8 h-8 text-primary-500 dark:text-primary-400" />
          </div>
          <h4 className="font-display font-bold text-lg">No users found.</h4>
        </div>
      ) : (
        <div className="rounded-2xl bg-surface-1 border border-surface-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-left text-muted">
                  <th className="px-5 py-3 font-bold">Name</th>
                  <th className="px-5 py-3 font-bold">Email</th>
                  <th className="px-5 py-3 font-bold">Role</th>
                  <th className="px-5 py-3 font-bold">Detail</th>
                  <th className="px-5 py-3 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u._id} className="border-b border-surface-border/60 last:border-0">
                    <td className="px-5 py-3 font-medium whitespace-nowrap">{u.name}</td>
                    <td className="px-5 py-3 text-muted break-all">{u.email}</td>
                    <td className="px-5 py-3"><span className="px-2.5 py-0.5 rounded-full text-xs font-bold capitalize bg-surface-2">{u.role.replace('_', ' ')}</span></td>
                    <td className="px-5 py-3 text-muted">{u.companyName || u.university || (u.verificationStatus ?? '—')}</td>
                    <td className="px-5 py-3 text-right">
                      {u._id === session?.user?.id ? (
                        <span className="text-xs text-muted">You</span>
                      ) : (
                        <button
                          onClick={() => remove(u._id, u.name)}
                          disabled={deletingId === u._id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-error hover:bg-error-bg font-bold disabled:opacity-50 transition-colors"
                        >
                          {deletingId === u._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (p: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-4">
      <button onClick={() => onChange(page - 1)} disabled={page <= 1} className="px-4 py-2 rounded-xl bg-surface-1 border border-surface-border font-bold text-sm disabled:opacity-40 transition-all">Previous</button>
      <span className="text-sm text-muted">Page {page} of {totalPages}</span>
      <button onClick={() => onChange(page + 1)} disabled={page >= totalPages} className="px-4 py-2 rounded-xl bg-surface-1 border border-surface-border font-bold text-sm disabled:opacity-40 transition-all">Next</button>
    </div>
  );
}
