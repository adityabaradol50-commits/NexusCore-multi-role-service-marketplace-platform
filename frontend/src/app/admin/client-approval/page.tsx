'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { ShieldCheck, CheckCircle2, XCircle, Building } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

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
    onSuccess: (_, variables) => {
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
      <PageHeader
        title="Owner Provider Vetting Queue"
        description="Review business documentation, KYC profiles, and grant marketplace publishing privileges."
        badgeText={`${pendingClients.length} Pending Applications`}
        badgeVariant="warning"
      />

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
            <Card
              key={client.id}
              hoverEffect
              className="p-5"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-indigo-400 font-bold">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-100">{client.business_name}</h3>
                      <p className="text-xs text-indigo-400 font-medium">{client.category || 'General Services'}</p>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-300 max-w-2xl bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                    {client.business_description || 'No business description provided yet.'}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                    {client.tax_id && <span>Tax/EIN: <strong className="text-zinc-200">{client.tax_id}</strong></span>}
                    {client.address && <span>Location: <strong className="text-zinc-200">{client.address}</strong></span>}
                    <span>Applied: <strong className="text-zinc-200">{new Date(client.created_at).toLocaleDateString()}</strong></span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  {rejectingId === client.id ? (
                    <div className="flex flex-col gap-2 p-3 bg-zinc-950 border border-zinc-800 rounded-xl w-full sm:w-80">
                      <Input
                        placeholder="Rejection reason (e.g. Invalid license)..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                      />
                      <div className="flex items-center gap-2 justify-end">
                        <Button onClick={() => setRejectingId(null)} variant="secondary" size="sm">
                          Cancel
                        </Button>
                        <Button
                          onClick={() => approvalMutation.mutate({ clientId: client.id, status: 'REJECTED', reason: rejectionReason })}
                          isLoading={approvalMutation.isPending}
                          variant="danger"
                          size="sm"
                        >
                          Confirm Reject
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Button
                        onClick={() => setRejectingId(client.id)}
                        disabled={approvalMutation.isPending}
                        variant="danger"
                        size="sm"
                        leftIcon={<XCircle className="w-4 h-4" />}
                      >
                        Reject
                      </Button>
                      <Button
                        onClick={() => approvalMutation.mutate({ clientId: client.id, status: 'APPROVED' })}
                        disabled={approvalMutation.isPending}
                        variant="primary"
                        size="sm"
                        leftIcon={<CheckCircle2 className="w-4 h-4" />}
                      >
                        Approve Provider
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
