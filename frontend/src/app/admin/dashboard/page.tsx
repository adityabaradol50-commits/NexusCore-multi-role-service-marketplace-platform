'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { 
  TrendingUp, DollarSign, Users, ShieldAlert, ArrowRight, 
  ShoppingBag, CheckCircle2, ShieldCheck, AlertTriangle, Layers, CreditCard
} from 'lucide-react';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';

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
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-950/50 via-slate-900 to-slate-900 p-6 sm:p-8 rounded-2xl border border-rose-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div>
          <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Platform Command Center</span>
          <h1 className="text-2xl font-black text-white mt-1">Platform Governance & Operations</h1>
          <p className="text-xs text-slate-400 mt-1">Monitor platform metrics, vet business providers, track GMV, and manage governance policies.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-rose-500/10 text-xs text-rose-300 border border-rose-500/30 font-bold uppercase tracking-wider">
            ADMINISTRATOR
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400 block font-medium">Gross Merch Value</span>
              <p className="text-2xl font-extrabold text-white mt-2">
                ${analytics?.gross_merchandise_value ? parseFloat(analytics.gross_merchandise_value).toFixed(2) : '0.00'}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">Total volume processed</span>
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400 block font-medium">Platform Revenue (10%)</span>
              <p className="text-2xl font-extrabold text-emerald-400 mt-2">
                ${analytics?.total_platform_revenue ? parseFloat(analytics.total_platform_revenue).toFixed(2) : '0.00'}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">Net fee earnings retained</span>
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400 block font-medium">Registered Accounts</span>
              <p className="text-2xl font-extrabold text-indigo-400 mt-2">
                {analytics?.total_users || 0}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">{analytics?.total_consumers || 0} Consumers • {analytics?.total_clients || 0} Clients</span>
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400 block font-medium">Pending Vetting</span>
              <p className="text-2xl font-extrabold text-rose-400 mt-2">
                {analytics?.pending_client_approvals || 0}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">Businesses awaiting approval</span>
            </div>
          </>
        )}
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium block">Approved Clients</span>
          <span className="text-lg font-bold text-emerald-400 mt-1 block">{analytics?.approved_clients || 0}</span>
        </div>
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium block">Published Services</span>
          <span className="text-lg font-bold text-indigo-300 mt-1 block">{analytics?.total_services || 0}</span>
        </div>
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium block">Completed Orders</span>
          <span className="text-lg font-bold text-emerald-300 mt-1 block">{analytics?.completed_orders || 0}</span>
        </div>
        <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl">
          <span className="text-[11px] text-slate-400 font-medium block">Pending Client Payouts</span>
          <span className="text-lg font-bold text-amber-300 mt-1 block">
            ${analytics?.pending_payouts ? parseFloat(analytics.pending_payouts).toFixed(2) : '0.00'}
          </span>
        </div>
      </div>

      {/* Pending Vetting Alert Box */}
      {pendingClients.length > 0 && (
        <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h3 className="text-xs font-bold text-amber-300">{pendingClients.length} Business Applications Awaiting Review</h3>
              <p className="text-xs text-slate-400 mt-0.5">Vetting is required before these providers can offer services to consumers.</p>
            </div>
          </div>
          <Link
            href="/admin/client-approval"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow shrink-0 transition-all"
          >
            Review Applications Queue →
          </Link>
        </div>
      )}

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/admin/client-approval"
          className="p-5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between group transition-all"
        >
          <div>
            <h3 className="text-xs font-bold text-white group-hover:text-rose-400 transition-colors">Client Approvals</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Inspect documentation and approve accounts.</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
        </Link>

        <Link
          href="/admin/orders"
          className="p-5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between group transition-all"
        >
          <div>
            <h3 className="text-xs font-bold text-white group-hover:text-rose-400 transition-colors">Master Order Ledger</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Audit transaction states across all clients.</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
        </Link>

        <Link
          href="/admin/audit-logs"
          className="p-5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between group transition-all"
        >
          <div>
            <h3 className="text-xs font-bold text-white group-hover:text-rose-400 transition-colors">Audit Trail</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Immutable governance logs and actor trails.</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white" />
        </Link>
      </div>
    </div>
  );
}
