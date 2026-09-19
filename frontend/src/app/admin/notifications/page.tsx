'use client';

import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Bell, CheckCheck, Clock } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

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
      <PageHeader
        title="Administrative System Notifications"
        description="Real-time security notifications, client onboarding alerts, and operational updates."
        actions={
          unreadCount > 0 ? (
            <Button
              onClick={() => markAllReadMutation.mutate()}
              isLoading={markAllReadMutation.isPending}
              variant="outline"
              size="sm"
              leftIcon={<CheckCheck className="w-4 h-4" />}
            >
              Mark All as Read ({unreadCount})
            </Button>
          ) : undefined
        }
      />

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
            <Card
              key={n.id}
              hoverEffect
              className={`p-4 transition-all ${
                !n.is_read ? 'bg-zinc-900 border-indigo-500/30' : 'bg-zinc-900/40 border-zinc-800/80 opacity-80'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                    )}
                    <h3 className="text-xs font-semibold text-zinc-100">{n.title}</h3>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">{n.message}</p>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-400 pt-1">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-400" /> {new Date(n.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>

                {!n.is_read && (
                  <Button
                    onClick={() => markReadMutation.mutate(n.id)}
                    variant="secondary"
                    size="sm"
                  >
                    Mark read
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
