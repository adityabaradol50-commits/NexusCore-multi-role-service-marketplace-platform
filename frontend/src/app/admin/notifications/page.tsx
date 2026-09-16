'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Bell, CheckCheck, Clock, ExternalLink } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

export default function AdminNotificationsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['adminNotifications'],
    queryFn: async () => {
      const res = await api.get('/admin/notifications');
      return res.data;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/admin/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminNotifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await api.patch('/admin/notifications/read-all');
    },
    onSuccess: () => {
      addToast('All notifications marked as read', 'success');
      queryClient.invalidateQueries({ queryKey: ['adminNotifications'] });
    },
  });

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-indigo-400" />
            Administrative System Notifications
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time security notifications, client onboarding alerts, and operational updates.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-indigo-300 rounded-xl border border-indigo-500/30 flex items-center gap-2 transition-all self-start sm:self-auto"
          >
            <CheckCheck className="w-4 h-4" />
            Mark All as Read ({unreadCount})
          </button>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No Notifications"
          description="Administrative alerts and system updates will appear here."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((n: any) => (
            <div
              key={n.id}
              className={`p-4 rounded-2xl border transition-all ${
                !n.is_read
                  ? 'bg-slate-900 border-indigo-500/30 shadow-lg'
                  : 'bg-slate-900/40 border-slate-800/80 opacity-80'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                    )}
                    <h3 className="text-sm font-bold text-white">{n.title}</h3>
                  </div>
                  <p className="text-xs text-slate-300">{n.message}</p>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!n.is_read && (
                  <button
                    onClick={() => markReadMutation.mutate(n.id)}
                    className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 rounded-lg shrink-0"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
