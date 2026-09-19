'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { FileText } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';

export default function AdminAuditLogsPage() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['adminAuditLogs'],
    queryFn: async () => {
      const res = await api.get('/admin/audit-logs');
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Audit Logs & Trail"
        description="Immutable event stream capturing administrative actions, provider approvals, and system state transitions."
        badgeText="Security Log"
        badgeVariant="primary"
      />

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Audit Logs Recorded"
          description="Administrative mutations and approval actions will be recorded here."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Target Entity</TableHead>
              <TableHead>Details / Metadata</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log: any) => (
              <TableRow key={log.id} className="font-mono text-[11px]">
                <TableCell className="text-zinc-400">
                  {new Date(log.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Badge variant="primary" size="sm">
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-zinc-200">
                  {log.actor_email || log.actor_id?.slice(0, 8) || 'System'}
                </TableCell>
                <TableCell className="text-zinc-300">
                  {log.target_entity} ({log.target_id?.slice(0, 8)})
                </TableCell>
                <TableCell className="text-zinc-400 max-w-xs truncate">
                  {log.details ? JSON.stringify(log.details) : '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
