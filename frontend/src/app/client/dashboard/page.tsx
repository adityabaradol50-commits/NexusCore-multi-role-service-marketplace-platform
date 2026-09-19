'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { 
  Inbox, Clock, AlertTriangle, Star, ArrowRight, ShieldCheck, XCircle
} from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

export default function ClientDashboardPage() {
  const { user } = useAuth();

  const { data: analytics, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ['clientDashboardAnalytics'],
    queryFn: async () => {
      const res = await api.get('/client/analytics');
      return res.data;
    },
  });

  const { data: recentOrders = [], isLoading: isOrdersLoading } = useQuery({
    queryKey: ['clientDashboardRecentOrders'],
    queryFn: async () => {
      const res = await api.get('/client/orders');
      return res.data;
    },
  });

  const approvalStatus = user?.client_profile?.approval_status || 'PENDING_APPROVAL';

  return (
    <div className="space-y-6">
      <PageHeader
        title={user?.client_profile?.business_name || 'Business Portal'}
        description={`Owner: ${user?.first_name} ${user?.last_name} — Manage catalog offerings, process customer requests, track client spend, and inspect earnings.`}
        badgeText={approvalStatus}
        badgeVariant={approvalStatus === 'APPROVED' ? 'success' : approvalStatus === 'REJECTED' ? 'danger' : 'warning'}
        actions={
          <Link href="/client/services">
            <Button variant="primary" size="sm">
              Manage Catalog Offerings
            </Button>
          </Link>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {isAnalyticsLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <Link href="/client/revenue">
              <StatCard
                title="Available Balance"
                value={`$${analytics?.available_balance !== undefined ? analytics.available_balance.toFixed(2) : '0.00'}`}
                subtitle="Ready for settlement →"
                changeType="positive"
                icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
                iconBg="bg-emerald-500/10 border-emerald-500/20"
              />
            </Link>

            <Link href="/client/requests">
              <StatCard
                title="Total Bookings"
                value={analytics?.total_orders || 0}
                subtitle={`${analytics?.pending_orders || 0} requiring action →`}
                changeType="neutral"
                icon={<Clock className="w-4 h-4 text-amber-400" />}
                iconBg="bg-amber-500/10 border-amber-500/20"
              />
            </Link>

            <Link href="/client/revenue">
              <StatCard
                title="Net 90% Earnings"
                value={`$${analytics?.lifetime_earnings !== undefined ? analytics.lifetime_earnings.toFixed(2) : '0.00'}`}
                subtitle="90% owner share earned →"
                changeType="positive"
                icon={<ShieldCheck className="w-4 h-4 text-indigo-400" />}
                iconBg="bg-indigo-500/10 border-indigo-500/20"
              />
            </Link>

            <Link href="/client/reviews">
              <StatCard
                title="Customer Rating"
                value={`${analytics?.average_rating ? Number(analytics.average_rating).toFixed(1) : '5.0'} / 5`}
                subtitle={`From ${analytics?.total_reviews || 0} verified reviews →`}
                changeType="positive"
                icon={<Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
                iconBg="bg-amber-500/10 border-amber-500/20"
              />
            </Link>
          </>
        )}
      </div>

      {/* Verification Guard Alert Box */}
      {approvalStatus !== 'APPROVED' && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-1.5 text-xs text-amber-200">
          <h3 className="font-semibold text-amber-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Publishing Restrictions Active</span>
          </h3>
          <p className="text-zinc-300 leading-relaxed">
            Because your business profile status is currently <span className="font-bold uppercase text-amber-400">{approvalStatus}</span>, public service offerings and customer orders require administrative approval.
          </p>
          <div className="pt-1">
            <Link
              href="/client/profile"
              className="text-amber-400 hover:text-amber-300 font-medium underline"
            >
              Review and update business documentation →
            </Link>
          </div>
        </div>
      )}

      {/* Recent Requests Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
          <h2 className="text-sm font-semibold text-zinc-100">Recent Incoming Requests</h2>
          <Link href="/client/requests" className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1">
            <span>View All Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No recent requests"
            description="Incoming consumer booking requests will appear here as soon as orders are submitted."
          />
        ) : (
          <div className="grid gap-3">
            {recentOrders.slice(0, 4).map((ord: any) => (
              <Card
                key={ord.id}
                hoverEffect
                className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-zinc-100 text-xs">{ord.order_number}</span>
                    <Badge status={ord.status} size="sm" />
                  </div>
                  <p className="text-xs text-zinc-300 mt-1">
                    Customer: <span className="font-medium text-zinc-100">{ord.consumer_name}</span> — {ord.items?.[0]?.item_title || 'Service Offering'}
                  </p>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <span className="text-xs font-bold text-emerald-400">${parseFloat(ord.client_earnings).toFixed(2)}</span>
                  <Link
                    href={`/client/requests?orderId=${ord.id}`}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    Manage Request →
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/client/requests">
          <Card hoverEffect className="p-4 flex items-center justify-between group">
            <div>
              <h3 className="text-xs font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors">Booking Requests</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">Accept, decline, and update orders.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-200 transition-colors" />
          </Card>
        </Link>

        <Link href="/client/services">
          <Card hoverEffect className="p-4 flex items-center justify-between group">
            <div>
              <h3 className="text-xs font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors">Service Offerings</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">Manage public catalog and pricing.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-200 transition-colors" />
          </Card>
        </Link>

        <Link href="/client/customers">
          <Card hoverEffect className="p-4 flex items-center justify-between group">
            <div>
              <h3 className="text-xs font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors">Customer Directory</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">View client contacts and spend.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-200 transition-colors" />
          </Card>
        </Link>

        <Link href="/client/reviews">
          <Card hoverEffect className="p-4 flex items-center justify-between group">
            <div>
              <h3 className="text-xs font-semibold text-zinc-100 group-hover:text-emerald-400 transition-colors">Customer Reviews</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">Monitor ratings and testimonials.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-200 transition-colors" />
          </Card>
        </Link>
      </div>
    </div>
  );
}
