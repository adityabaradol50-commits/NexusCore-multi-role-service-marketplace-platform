'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { 
  Users, ShieldAlert, ArrowRight, ShieldCheck, AlertTriangle
} from 'lucide-react';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

export default function AdminDashboardPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['adminDashboardAnalytics'],
    queryFn: async () => {
      const res = await api.get('/admin/analytics');
      return res.data;
    },
  });

  const { data: pendingClients = [] } = useQuery({
    queryKey: ['adminPendingClientsSummary'],
    queryFn: async () => {
      const res = await api.get('/admin/clients/pending');
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Governance & Command Center"
        description="Monitor marketplace volume, vet business providers, inspect 10% platform revenue, and review audit logs."
        badgeText="ADMINISTRATOR"
        badgeVariant="danger"
        actions={
          <Link href="/admin/client-approval">
            <Button variant="primary" size="sm" leftIcon={<ShieldAlert className="w-3.5 h-3.5" />}>
              Applications Queue ({pendingClients.length})
            </Button>
          </Link>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {isLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Gross Marketplace Volume"
              value={`$${analytics?.gross_merchandise_value ? parseFloat(analytics.gross_merchandise_value).toFixed(2) : '0.00'}`}
              subtitle="Total transaction volume processed"
              changeType="positive"
              icon={<ShieldCheck className="w-4 h-4 text-indigo-400" />}
              iconBg="bg-indigo-500/10 border-indigo-500/20"
            />

            <StatCard
              title="Platform Fee Revenue (10%)"
              value={`$${analytics?.total_platform_revenue ? parseFloat(analytics.total_platform_revenue).toFixed(2) : '0.00'}`}
              subtitle="10% platform take retained"
              changeType="positive"
              icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
              iconBg="bg-emerald-500/10 border-emerald-500/20"
            />

            <StatCard
              title="Registered Accounts"
              value={analytics?.total_users || 0}
              subtitle={`${analytics?.total_consumers || 0} Clients • ${analytics?.total_clients || 0} Owners`}
              changeType="neutral"
              icon={<Users className="w-4 h-4 text-zinc-300" />}
              iconBg="bg-zinc-800 border-zinc-700"
            />

            <StatCard
              title="Pending Owner Approvals"
              value={analytics?.pending_client_approvals || 0}
              subtitle="Businesses awaiting vetting"
              changeType={analytics?.pending_client_approvals > 0 ? "negative" : "neutral"}
              icon={<ShieldAlert className="w-4 h-4 text-rose-400" />}
              iconBg="bg-rose-500/10 border-rose-500/20"
            />
          </>
        )}
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl">
          <span className="text-[11px] text-zinc-400 font-medium block">Approved Providers</span>
          <span className="text-lg font-bold text-emerald-400 mt-1 block">{analytics?.approved_clients || 0}</span>
        </div>
        <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl">
          <span className="text-[11px] text-zinc-400 font-medium block">Published Services</span>
          <span className="text-lg font-bold text-indigo-400 mt-1 block">{analytics?.total_services || 0}</span>
        </div>
        <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl">
          <span className="text-[11px] text-zinc-400 font-medium block">Completed Orders</span>
          <span className="text-lg font-bold text-emerald-400 mt-1 block">{analytics?.completed_orders || 0}</span>
        </div>
        <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-xl">
          <span className="text-[11px] text-zinc-400 font-medium block">Pending Owner Payouts</span>
          <span className="text-lg font-bold text-amber-400 mt-1 block">
            ${analytics?.pending_payouts ? parseFloat(analytics.pending_payouts).toFixed(2) : '0.00'}
          </span>
        </div>
      </div>

      {/* Pending Vetting Alert Box */}
      {pendingClients.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h3 className="text-xs font-semibold text-amber-300">{pendingClients.length} Business Applications Awaiting Review</h3>
              <p className="text-xs text-zinc-400 mt-0.5">Vetting is required before these providers can offer services to consumers.</p>
            </div>
          </div>
          <Link href="/admin/client-approval">
            <Button variant="primary" size="sm">
              Review Queue →
            </Button>
          </Link>
        </div>
      )}

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/admin/client-approval">
          <Card hoverEffect className="p-4 flex items-center justify-between group">
            <div>
              <h3 className="text-xs font-semibold text-zinc-100 group-hover:text-rose-400 transition-colors">Client Approvals</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">Inspect documentation and approve accounts.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-200" />
          </Card>
        </Link>

        <Link href="/admin/orders">
          <Card hoverEffect className="p-4 flex items-center justify-between group">
            <div>
              <h3 className="text-xs font-semibold text-zinc-100 group-hover:text-rose-400 transition-colors">Master Order Ledger</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">Audit transaction states across all clients.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-200" />
          </Card>
        </Link>

        <Link href="/admin/audit-logs">
          <Card hoverEffect className="p-4 flex items-center justify-between group">
            <div>
              <h3 className="text-xs font-semibold text-zinc-100 group-hover:text-rose-400 transition-colors">Audit Trail</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">Immutable governance logs and actor trails.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-zinc-200" />
          </Card>
        </Link>
      </div>
    </div>
  );
}
