'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { Users, Search, Eye } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';

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
      <PageHeader
        title="Consumers Directory"
        description="Review registered client consumer accounts and manage platform access privileges."
        actions={
          <div className="w-64">
            <Input
              placeholder="Search consumers..."
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
          icon={Users}
          title="No Consumers Found"
          description={search ? `No consumer accounts match "${search}".` : 'Registered consumer accounts will be listed here.'}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Consumer Name</TableHead>
              <TableHead>Email Address</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Account Status</TableHead>
              <TableHead>Registered Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u: any) => (
              <TableRow key={u.id}>
                <TableCell className="font-semibold text-zinc-100">{u.first_name} {u.last_name}</TableCell>
                <TableCell className="text-zinc-300">{u.email}</TableCell>
                <TableCell className="text-zinc-400">{u.phone || 'N/A'}</TableCell>
                <TableCell>
                  <Badge status={u.status} size="sm" />
                </TableCell>
                <TableCell className="text-zinc-400">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      onClick={() => setSelectedUser(u)}
                      variant="outline"
                      size="sm"
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                    >
                      Inspect
                    </Button>
                    <Button
                      onClick={() => toggleStatusMutation.mutate({
                        userId: u.id,
                        status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
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

      {/* Detail Modal */}
      {selectedUser && (
        <Modal
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          title={`${selectedUser.first_name} ${selectedUser.last_name}`}
          description={selectedUser.email}
          maxWidth="md"
          footer={
            <Button onClick={() => setSelectedUser(null)} variant="secondary" size="sm">
              Close
            </Button>
          }
        >
          <div className="space-y-2 bg-zinc-950 p-4 rounded-xl border border-zinc-800 text-xs text-zinc-300">
            <div><strong className="text-zinc-400 font-medium">Phone:</strong> {selectedUser.phone || 'N/A'}</div>
            <div><strong className="text-zinc-400 font-medium">Status:</strong> {selectedUser.status}</div>
            <div><strong className="text-zinc-400 font-medium">Role:</strong> {selectedUser.role}</div>
            <div><strong className="text-zinc-400 font-medium">Joined:</strong> {new Date(selectedUser.created_at).toLocaleString()}</div>
          </div>
        </Modal>
      )}
    </div>
  );
}
