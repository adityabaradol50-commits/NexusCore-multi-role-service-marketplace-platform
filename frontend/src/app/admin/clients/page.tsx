'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Building, Search, Eye } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';

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
      <PageHeader
        title="Owner Provider Businesses"
        description="Master directory of registered provider businesses, vetting levels, and account access controls."
        actions={
          <div className="w-64">
            <Input
              placeholder="Search provider business..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={<Search className="w-4 h-4 text-zinc-400" />}
            />
          </div>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : users.length === 0 ? (
        <EmptyState
          icon={Building}
          title="No Clients Found"
          description={search ? `No client provider businesses match "${search}".` : 'Registered client provider businesses will appear here.'}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Business Name</TableHead>
              <TableHead>Contact Representative</TableHead>
              <TableHead>Email Address</TableHead>
              <TableHead>Vetting Status</TableHead>
              <TableHead>Account Access</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u: any) => (
              <TableRow key={u.id}>
                <TableCell className="font-bold text-zinc-100">
                  {u.client_profile?.business_name || 'N/A'}
                </TableCell>
                <TableCell>{u.first_name} {u.last_name}</TableCell>
                <TableCell className="text-indigo-400 font-medium">{u.email}</TableCell>
                <TableCell>
                  <Badge status={u.client_profile?.approval_status || 'PENDING_APPROVAL'} size="sm" />
                </TableCell>
                <TableCell>
                  <Badge status={u.status} size="sm" />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      onClick={() => setSelectedClient(u)}
                      variant="outline"
                      size="sm"
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                    >
                      Inspect
                    </Button>
                    <Button
                      onClick={() => toggleUserStatusMutation.mutate({
                        userId: u.id,
                        status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
                      })}
                      variant={u.status === 'ACTIVE' ? 'danger' : 'success'}
                      size="sm"
                    >
                      {u.status === 'ACTIVE' ? 'Suspend' : 'Unblock'}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Inspect Client Detail Modal */}
      {selectedClient && (
        <Modal
          isOpen={!!selectedClient}
          onClose={() => setSelectedClient(null)}
          title={selectedClient.client_profile?.business_name || 'Provider Account'}
          description={selectedClient.email}
          maxWidth="md"
          footer={
            <Button onClick={() => setSelectedClient(null)} variant="secondary" size="sm">
              Close
            </Button>
          }
        >
          <div className="space-y-2 bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs text-zinc-300">
            <div><strong className="text-zinc-400 font-medium">Representative:</strong> {selectedClient.first_name} {selectedClient.last_name}</div>
            {selectedClient.phone && <div><strong className="text-zinc-400 font-medium">Phone:</strong> {selectedClient.phone}</div>}
            {selectedClient.client_profile?.service_area && <div><strong className="text-zinc-400 font-medium">Service Area:</strong> {selectedClient.client_profile.service_area}</div>}
            <div><strong className="text-zinc-400 font-medium">Vetting Status:</strong> {selectedClient.client_profile?.approval_status}</div>
            {selectedClient.client_profile?.rejection_reason && (
              <div className="text-rose-400">
                <strong>Rejection Reason:</strong> {selectedClient.client_profile.rejection_reason}
              </div>
            )}
            <div><strong className="text-zinc-400 font-medium">Account Access:</strong> {selectedClient.status}</div>
            <div><strong className="text-zinc-400 font-medium">Registration Date:</strong> {new Date(selectedClient.created_at).toLocaleString()}</div>
          </div>
        </Modal>
      )}
    </div>
  );
}
