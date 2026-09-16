'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { ShieldCheck, CheckCircle2, XCircle, Clock, AlertTriangle, Building, Mail, Phone } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

export default function ClientApprovalPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const { data: pendingClients = [], isLoading } = useQuery({
    queryKey: ['pendingClients'],
    queryFn: async () => {
      const res = await api.get('/admin/clients/pending');
      return res.data;
    },
  });

  const approvalMutation = useMutation({
    mutationFn: async ({ clientId, status, reason }: { clientId: string; status: string; reason?: string }) => {
      const res = await api.patch(`/admin/clients/${clientId}/approval`, {
        approval_status: status,
        rejection_reason: reason,
      });
      return res.data;
    },
    onSuccess: (data, variables) => {
      addToast(
        variables.status === 'APPROVED' ? 'Client approved successfully!' : 'Client application rejected.',
        variables.status === 'APPROVED' ? 'success' : 'info'
      );
      queryClient.invalidateQueries({ queryKey: ['pendingClients'] });
      queryClient.invalidateQueries({ queryKey: ['adminClientsList'] });
      queryClient.invalidateQueries({ queryKey: ['adminAnalytics'] });
      setRejectingId(null);
      setRejectionReason('');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.detail || 'Failed to update approval status', 'error');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
            Client Provider Approvals
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review business documentation, KYC profiles, and grant marketplace publishing privileges.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs font-semibold">
          <Clock className="w-4 h-4" />
          {pendingClients.length} Pending Vetting
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : pendingClients.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="All Applications Processed"
          description="There are currently no provider business applications awaiting administrative approval."
        />
      ) : (
        <div className="space-y-4">
          {pendingClients.map((client: any) => (
            <div
              key={client.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl transition-all hover:border-slate-700"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{client.business_name}</h3>
                      <p className="text-xs text-indigo-400 font-medium">{client.category || 'General Services'}</p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 max-w-2xl bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                    {client.business_description || 'No business description provided yet.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                    {client.tax_id && <span>Tax/EIN: <strong className="text-slate-200">{client.tax_id}</strong></span>}
                    {client.address && <span>Location: <strong className="text-slate-200">{client.address}</strong></span>}
                    <span>Applied: <strong className="text-slate-200">{new Date(client.created_at).toLocaleDateString()}</strong></span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {rejectingId === client.id ? (
                    <div className="flex flex-col gap-2 p-3 bg-slate-800 border border-slate-700 rounded-xl">
                      <input
                        type="text"
                        placeholder="Rejection reason (e.g. Invalid license)..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => setRejectingId(null)}
                          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => approvalMutation.mutate({ clientId: client.id, status: 'REJECTED', reason: rejectionReason })}
                          disabled={approvalMutation.isPending}
                          className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-xs text-white font-semibold rounded-lg"
                        >
                          Confirm Reject
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setRejectingId(client.id)}
                        disabled={approvalMutation.isPending}
                        className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Reject
                      </button>
                      <button
                        onClick={() => approvalMutation.mutate({ clientId: client.id, status: 'APPROVED' })}
                        disabled={approvalMutation.isPending}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Approve Provider
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
