'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Bell, Check, CheckCheck, ExternalLink } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

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
      <PageHeader
        title="Notifications & Activity Feed"
        description="Real-time status updates for your bookings, order acceptances, and platform notifications."
        actions={
          unreadCount > 0 ? (
            <Button
              onClick={() => markAllReadMutation.mutate()}
              isLoading={markAllReadMutation.isPending}
              variant="outline"
              size="sm"
              leftIcon={<CheckCheck className="w-4 h-4" />}
            >
              Mark All Read ({unreadCount})
            </Button>
          ) : undefined
        }
      />

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
            <Card
              key={notif.id}
              hoverEffect
              className={`p-4 flex justify-between items-start gap-4 ${
                notif.is_read ? 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400' : 'bg-zinc-900 border-indigo-500/30 text-zinc-100'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-zinc-100">{notif.title}</span>
                  {!notif.is_read && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">{notif.message}</p>
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-[10px] text-zinc-400">{new Date(notif.created_at).toLocaleString()}</span>
                  {notif.link && (
                    <Link
                      href={notif.link.startsWith('/') ? notif.link : '/consumer/orders'}
                      className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>View Related Order</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>

              {!notif.is_read && (
                <Button
                  onClick={() => markReadMutation.mutate(notif.id)}
                  variant="secondary"
                  size="sm"
                >
                  <Check className="w-3.5 h-3.5" />
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
