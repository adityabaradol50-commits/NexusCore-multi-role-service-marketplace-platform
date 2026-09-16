'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { TrendingUp, DollarSign, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';

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
      <div>
        <h1 className="text-2xl font-bold text-white">Revenue & Financial Statements</h1>
        <p className="text-xs text-slate-400 mt-1">Detailed breakdown of gross earnings, platform commission deductions, and net payout balances.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Withdrawable Available Balance</span>
          <p className="text-3xl font-extrabold text-emerald-400">${available.toFixed(2)}</p>
          <p className="text-xs text-slate-500">Credited automatically upon marking bookings as completed.</p>
        </div>

        <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Cumulative Net Revenue</span>
          <p className="text-3xl font-extrabold text-indigo-400">${lifetime.toFixed(2)}</p>
          <p className="text-xs text-slate-500">Across {completed} completed customer contracts.</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Platform Commission & Fee Structure</span>
        </h3>
        <div className="text-xs text-slate-300 space-y-2">
          <p>• Standard Marketplace Commission: <strong>10.0%</strong> deducted automatically at transaction completion.</p>
          <p>• Provider Net Share: <strong>90.0%</strong> directly deposited into business available balance.</p>
          <p>• Processing Speed: Real-time atomic database balance updates with transaction rollback protection.</p>
        </div>
      </div>
    </div>
  );
}
