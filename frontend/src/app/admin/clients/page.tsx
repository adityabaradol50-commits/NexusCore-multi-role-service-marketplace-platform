'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Building, ShieldCheck, Clock, Search, XCircle, Eye, AlertTriangle } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

export default function AdminClientsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<any | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['adminClientsList', search],
    queryFn: async () => {
      const params: any = { role_filter: 'client' };
      if (search) params.q = search;
      const res = await api.get('/admin/users', { params });
      return res.data;
    },
  });

  const toggleUserStatusMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: string }) => {
      await api.patch(`/admin/users/${userId}/status`, { status });
    },
    onSuccess: (_, vars) => {
      addToast(`Client account status set to ${vars.status}`, 'success');
      queryClient.invalidateQueries({ queryKey: ['adminClientsList'] });
      setSelectedClient(null);
    },
    onError: (err: any) => {
      addToast(err.response?.data?.detail || 'Failed to update client status', 'error');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building className="w-6 h-6 text-indigo-400" />
            Client Business Providers
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Master directory of registered provider businesses, vetting levels, and account access statuses.
          </p>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search clients..."
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
          icon={Building}
          title="No Clients Found"
          description={search ? `No client provider businesses match "${search}".` : 'Registered client provider businesses will appear here.'}
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-4">Business Name</th>
                <th className="p-4">Contact Representative</th>
                <th className="p-4">Email Address</th>
                <th className="p-4">Vetting Status</th>
                <th className="p-4">Account Access</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((u: any) => (
                <tr key={u.id} className="hover:bg-slate-800/40">
                  <td className="p-4 font-bold text-white">
                    {u.client_profile?.business_name || 'N/A'}
                  </td>
                  <td className="p-4">{u.first_name} {u.last_name}</td>
                  <td className="p-4 text-indigo-400">{u.email}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      u.client_profile?.approval_status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      u.client_profile?.approval_status === 'PENDING_APPROVAL' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {u.client_profile?.approval_status || 'PENDING_APPROVAL'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      u.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                      {u.status}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => setSelectedClient(u)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                    >
                      Inspect
                    </button>
                    <button
                      onClick={() => toggleUserStatusMutation.mutate({
                        userId: u.id,
                        status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
                      })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
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

      {/* Inspect Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-mono text-indigo-400 font-bold">Client Inspector</span>
                <h3 className="text-lg font-bold text-white">{selectedClient.client_profile?.business_name}</h3>
                <p className="text-xs text-slate-400">{selectedClient.email}</p>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 bg-slate-800/40 p-4 rounded-xl border border-slate-800 text-xs text-slate-300">
              <div><strong className="text-slate-400">Representative:</strong> {selectedClient.first_name} {selectedClient.last_name}</div>
              {selectedClient.phone && <div><strong className="text-slate-400">Phone:</strong> {selectedClient.phone}</div>}
              {selectedClient.client_profile?.service_area && <div><strong className="text-slate-400">Service Area:</strong> {selectedClient.client_profile.service_area}</div>}
              <div><strong className="text-slate-400">Vetting Status:</strong> {selectedClient.client_profile?.approval_status}</div>
              {selectedClient.client_profile?.rejection_reason && (
                <div className="text-rose-400">
                  <strong>Rejection Reason:</strong> {selectedClient.client_profile.rejection_reason}
                </div>
              )}
              <div><strong className="text-slate-400">Account Access:</strong> {selectedClient.status}</div>
              <div><strong className="text-slate-400">Registration Date:</strong> {new Date(selectedClient.created_at).toLocaleString()}</div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedClient(null)}
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
