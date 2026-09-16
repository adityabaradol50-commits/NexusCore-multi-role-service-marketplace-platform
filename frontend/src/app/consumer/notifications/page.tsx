'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Bell, Check, CheckCheck, ExternalLink } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

export default function ConsumerNotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['consumerNotifications'],
    queryFn: async () => {
      const res = await api.get('/consumer/notifications');
      return res.data;
    },
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/consumer/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consumerNotifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter((n: any) => !n.is_read);
      await Promise.all(unread.map((n: any) => api.patch(`/consumer/notifications/${n.id}/read`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consumerNotifications'] });
    },
  });

  const unreadCount = notifications.filter((n: any) => !n.is_read).length;

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications & Alerts</h1>
          <p className="text-xs text-slate-400 mt-1">Real-time status notifications for your bookings and platform messages.</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-indigo-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All as Read ({unreadCount})</span>
          </button>
        )}
      </div>

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="All caught up"
          description="You do not have any active or unread notifications at this time."
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((notif: any) => (
            <div
              key={notif.id}
              className={`p-4 rounded-xl border transition-all flex justify-between items-start gap-4 ${
                notif.is_read
                  ? 'bg-slate-900/50 border-slate-800/80 text-slate-400'
                  : 'bg-slate-900 border-indigo-500/30 text-slate-200 shadow-md'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-white">{notif.title}</span>
                  {!notif.is_read && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  )}
                </div>
                <p className="text-xs leading-relaxed">{notif.message}</p>
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[10px] text-slate-500">{new Date(notif.created_at).toLocaleString()}</span>
                  {notif.link && (
                    <Link
                      href={notif.link.startsWith('/') ? notif.link : '/consumer/orders'}
                      className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>View Related Item</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>

              {!notif.is_read && (
                <button
                  onClick={() => markReadMutation.mutate(notif.id)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs shrink-0"
                  title="Mark as read"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

