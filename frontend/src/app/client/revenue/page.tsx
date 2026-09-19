'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ShieldCheck } from 'lucide-react';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

export default function ClientRevenuePage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['clientRevenueAnalytics'],
    queryFn: async () => {
      const res = await api.get('/client/analytics');
      return res.data;
    },
  });

  if (isLoading) {
    return <CardSkeleton />;
  }

  const available = analytics?.available_balance || 0;
  const lifetime = analytics?.lifetime_earnings || 0;
  const completed = analytics?.completed_orders || 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Revenue & Financial Ledger"
        description="Detailed breakdown of gross earnings, platform commission deductions, and net payout balances."
        badgeText="90% Owner Earnings Share"
        badgeVariant="success"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <StatCard
          title="Withdrawable Available Balance"
          value={`$${available.toFixed(2)}`}
          subtitle="Credited automatically upon completing bookings"
          changeType="positive"
          icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
          iconBg="bg-emerald-500/10 border-emerald-500/20"
        />

        <StatCard
          title="Cumulative Net Revenue"
          value={`$${lifetime.toFixed(2)}`}
          subtitle={`Across ${completed} completed customer contracts`}
          changeType="positive"
          icon={<ShieldCheck className="w-4 h-4 text-indigo-400" />}
          iconBg="bg-indigo-500/10 border-indigo-500/20"
        />
      </div>

      <Card className="p-6 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Platform Commission & Fee Structure</span>
        </h3>
        <div className="text-xs text-zinc-400 space-y-2 leading-relaxed">
          <p>• Standard Marketplace Commission: <strong>10.0%</strong> deducted automatically at transaction completion.</p>
          <p>• Provider Net Share: <strong>90.0%</strong> directly deposited into business available balance.</p>
          <p>• Processing Speed: Real-time atomic database balance updates with transaction rollback protection.</p>
        </div>
      </Card>
    </div>
  );
}
