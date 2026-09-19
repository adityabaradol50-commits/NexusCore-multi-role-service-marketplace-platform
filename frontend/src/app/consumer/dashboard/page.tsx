'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { ShoppingBag, Clock, CheckCircle2, ArrowRight, Search, Star } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

export default function ConsumerDashboardPage() {
  const { user } = useAuth();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['consumerDashboardOrders'],
    queryFn: async () => {
      const res = await api.get('/consumer/orders');
      return res.data;
    },
  });

  const activeOrders = orders.filter((o: any) => ['PENDING', 'ACCEPTED', 'IN_PROGRESS'].includes(o.status));
  const completedOrders = orders.filter((o: any) => o.status === 'COMPLETED');
  const reviewedCount = orders.filter((o: any) => o.review).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.first_name || 'Client'}`}
        description="Manage your active service requests and track fulfillment updates in real time."
        actions={
          <Link href="/consumer/browse">
            <Button variant="primary" size="sm" leftIcon={<Search className="w-3.5 h-3.5" />}>
              Browse Offerings
            </Button>
          </Link>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {isLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Active Requests"
              value={activeOrders.length}
              subtitle="Pending provider acceptance or in progress"
              icon={<Clock className="w-4 h-4 text-amber-400" />}
              iconBg="bg-amber-500/10 border-amber-500/20"
            />
            <StatCard
              title="Completed Bookings"
              value={completedOrders.length}
              subtitle="Successfully fulfilled and delivered"
              icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              iconBg="bg-emerald-500/10 border-emerald-500/20"
            />
            <StatCard
              title="Verified Reviews"
              value={reviewedCount}
              subtitle="Ratings submitted for completed services"
              icon={<Star className="w-4 h-4 text-indigo-400" />}
              iconBg="bg-indigo-500/10 border-indigo-500/20"
            />
          </>
        )}
      </div>

      {/* Recent Activity List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
          <h2 className="text-sm font-semibold text-zinc-100">Recent Service Requests</h2>
          <Link href="/consumer/orders" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1">
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {orders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No orders yet"
            description="You haven't requested any services yet. Browse available catalog items to create your first booking."
            actionText="Explore Services"
            onAction={() => { window.location.href = '/consumer/browse'; }}
          />
        ) : (
          <div className="grid gap-3">
            {orders.slice(0, 5).map((ord: any) => (
              <Card
                key={ord.id}
                hoverEffect
                className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-zinc-100 text-xs">{ord.order_number}</span>
                    <Badge status={ord.status} size="sm" />
                  </div>
                  <p className="text-xs text-zinc-300 mt-1">{ord.items?.[0]?.item_title || 'Service Offering'}</p>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <span className="text-xs font-bold text-emerald-400">${parseFloat(ord.total_amount).toFixed(2)}</span>
                  <Link
                    href={`/consumer/orders?orderId=${ord.id}`}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                  >
                    View Details →
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
