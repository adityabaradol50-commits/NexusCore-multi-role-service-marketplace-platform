'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { Users, Search, Shield, AlertTriangle } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

export default function AdminConsumersPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['adminConsumersList', search],
    queryFn: async () => {
      const params: any = { role_filter: 'consumer' };
      if (search) params.q = search;
      const res = await api.get('/admin/users', { params });
      return res.data;
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      await api.patch(`/admin/users/${userId}/status`, { status });
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['adminConsumersList'] });
      addToast(`User account status set to ${vars.status}`, 'success');
      setSelectedUser(null);
    },
    onError: (err: any) => {
      addToast(err.response?.data?.detail || 'Failed to update user status', 'error');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-400" />
            Consumers Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review registered consumer accounts and manage platform access privileges.
          </p>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search consumers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No Consumers Found"
          description={search ? `No consumer accounts match "${search}".` : 'Registered consumer accounts will be listed here.'}
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-4">Consumer Name</th>
                <th className="p-4">Email Address</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Account Status</th>
                <th className="p-4">Registered Date</th>
                <th className="p-4 text-right">Access Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((u: any) => (
                <tr key={u.id} className="hover:bg-slate-800/40">
                  <td className="p-4 font-semibold text-white">{u.first_name} {u.last_name}</td>
                  <td className="p-4 text-slate-300">{u.email}</td>
                  <td className="p-4 text-slate-400">{u.phone || 'N/A'}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="p-4 text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => setSelectedUser(u)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                    >
                      Inspect
                    </button>
                    <button
                      onClick={() => toggleStatusMutation.mutate({
                        userId: u.id,
                        status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
                      })}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                        u.status === 'ACTIVE'
                          ? 'bg-rose-950/40 text-rose-300 hover:bg-rose-900/60 border border-rose-800/40'
                          : 'bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 border border-emerald-800/40'
                      }`}
                    >
                      {u.status === 'ACTIVE' ? 'Suspend' : 'Unblock'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-mono text-indigo-400 font-bold">Consumer Inspector</span>
                <h3 className="text-lg font-bold text-white">{selectedUser.first_name} {selectedUser.last_name}</h3>
                <p className="text-xs text-slate-400">{selectedUser.email}</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
            </div>

            <div className="space-y-2 bg-slate-800/40 p-4 rounded-xl border border-slate-800 text-xs text-slate-300">
              <div><strong className="text-slate-400">Phone:</strong> {selectedUser.phone || 'N/A'}</div>
              <div><strong className="text-slate-400">Status:</strong> {selectedUser.status}</div>
              <div><strong className="text-slate-400">Role:</strong> {selectedUser.role}</div>
              <div><strong className="text-slate-400">Joined:</strong> {new Date(selectedUser.created_at).toLocaleString()}</div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
