'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2, Trash2, Users } from 'lucide-react';

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

const ROLE_TABS = ['all', 'student', 'employer', 'admin', 'unassigned'] as const;

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const [role, setRole] = useState<(typeof ROLE_TABS)[number]>('all');
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  useEffect(() => { load(); }, [load]);

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
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">User Management</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Browse and remove accounts across the platform.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ROLE_TABS.map((t) => (
          <button
            key={t}
            onClick={() => { setRole(t); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all ${role === t ? 'bg-gradient-to-r from-accent-700 to-accent-400 text-white shadow' : 'bg-surface-1 border border-surface-border text-gray-500 dark:text-gray-400 hover:border-accent-400/40'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-accent-500" /></div>
      ) : users.length === 0 ? (
        <div className="p-14 rounded-3xl bg-surface-1 border border-surface-border shadow-sm text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-accent-100 dark:bg-accent-500/10 flex items-center justify-center mb-5">
            <Users className="w-8 h-8 text-accent-600 dark:text-accent-300" />
          </div>
          <h4 className="text-lg font-bold text-gray-900 dark:text-white">No users found.</h4>
        </div>
      ) : (
        <div className="rounded-2xl bg-surface-1 border border-surface-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border text-left text-gray-400 dark:text-gray-500">
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
                    <td className="px-5 py-3 font-medium text-gray-900 dark:text-white whitespace-nowrap">{u.name}</td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400 break-all">{u.email}</td>
                    <td className="px-5 py-3"><span className="px-2.5 py-0.5 rounded-full text-xs font-bold capitalize bg-surface-2 text-gray-600 dark:text-gray-300">{u.role}</span></td>
                    <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{u.companyName || u.university || (u.verificationStatus ?? '—')}</td>
                    <td className="px-5 py-3 text-right">
                      {u._id === session?.user?.id ? (
                        <span className="text-xs text-gray-400">You</span>
                      ) : (
                        <button
                          onClick={() => remove(u._id, u.name)}
                          disabled={deletingId === u._id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-bold disabled:opacity-50 transition-colors"
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
      <button onClick={() => onChange(page - 1)} disabled={page <= 1} className="px-4 py-2 rounded-xl bg-surface-1 border border-surface-border font-bold text-sm disabled:opacity-40 hover:border-accent-400/40 transition-all">Previous</button>
      <span className="text-sm text-gray-500 dark:text-gray-400">Page {page} of {totalPages}</span>
      <button onClick={() => onChange(page + 1)} disabled={page >= totalPages} className="px-4 py-2 rounded-xl bg-surface-1 border border-surface-border font-bold text-sm disabled:opacity-40 hover:border-accent-400/40 transition-all">Next</button>
    </div>
  );
}
