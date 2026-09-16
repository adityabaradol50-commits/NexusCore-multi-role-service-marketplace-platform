'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { FileText, Shield, User, Clock, Terminal } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

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
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-400" />
          Platform Audit Logs
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Immutable event stream capturing administrative actions, provider approvals, and status transitions.
        </p>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No Audit Logs Recorded"
          description="Administrative mutations and approval actions will be recorded here."
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-4">Timestamp</th>
                <th className="p-4">Action</th>
                <th className="p-4">Actor</th>
                <th className="p-4">Target Entity</th>
                <th className="p-4">Details / Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-800/40 font-mono text-[11px]">
                  <td className="p-4 text-slate-400">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-slate-200">
                    {log.actor_email || log.actor_id?.slice(0, 8) || 'System'}
                  </td>
                  <td className="p-4 text-slate-300">
                    {log.target_entity} ({log.target_id?.slice(0, 8)})
                  </td>
                  <td className="p-4 text-slate-400 max-w-xs truncate">
                    {log.details ? JSON.stringify(log.details) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
