'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { 
  Building, DollarSign, Inbox, CheckCircle2, Clock, 
  AlertTriangle, Star, ArrowRight, ShieldCheck, XCircle, ShoppingBag 
} from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';

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
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-950/50 via-slate-900 to-slate-900 p-6 sm:p-8 rounded-2xl border border-emerald-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          {user?.client_profile?.logo_url ? (
            <img
              src={user.client_profile.logo_url}
              alt={user?.client_profile?.business_name || 'Business Logo'}
              className="w-14 h-14 rounded-2xl object-contain bg-white/10 p-1.5 border border-emerald-500/30 shadow-lg shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black text-xl shadow-lg shrink-0">
              {user?.client_profile?.business_name ? user.client_profile.business_name.charAt(0) : 'O'}
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">
                OWNER
              </span>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs font-semibold text-slate-300">
                Owner: {user?.first_name} {user?.last_name}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
              {user?.client_profile?.business_name || 'My Business'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage catalog offerings, process customer requests, track client spend, and inspect earnings.
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div>
          {approvalStatus === 'APPROVED' && (
            <div className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 shadow">
              <ShieldCheck className="w-4 h-4" />
              <span>Verified Partner</span>
            </div>
          )}
          {approvalStatus === 'PENDING_APPROVAL' && (
            <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 shadow">
              <Clock className="w-4 h-4" />
              <span>Pending Review</span>
            </div>
          )}
          {approvalStatus === 'REJECTED' && (
            <div className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 shadow">
              <XCircle className="w-4 h-4" />
              <span>Application Rejected</span>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isAnalyticsLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <Link href="/client/revenue" className="p-5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all group">
              <span className="text-xs text-slate-400 block font-medium">Available Balance</span>
              <p className="text-2xl font-extrabold text-emerald-400 mt-2">
                ${analytics?.available_balance !== undefined ? analytics.available_balance.toFixed(2) : '0.00'}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">Ready for settlement →</span>
            </Link>

            <Link href="/client/requests" className="p-5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all group">
              <span className="text-xs text-slate-400 block font-medium">Total Bookings</span>
              <p className="text-2xl font-extrabold text-white mt-2">
                {analytics?.total_orders || 0}
              </p>
              <span className="text-[11px] text-amber-400 mt-1 block font-medium">{analytics?.pending_orders || 0} requiring action →</span>
            </Link>

            <Link href="/client/revenue" className="p-5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all group">
              <span className="text-xs text-slate-400 block font-medium">Lifetime Revenue</span>
              <p className="text-2xl font-extrabold text-indigo-400 mt-2">
                ${analytics?.lifetime_earnings !== undefined ? analytics.lifetime_earnings.toFixed(2) : '0.00'}
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block">Net completed earnings →</span>
            </Link>

            <Link href="/client/reviews" className="p-5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all group">
              <span className="text-xs text-slate-400 block font-medium">Customer Rating</span>
              <p className="text-2xl font-extrabold text-amber-400 mt-2 flex items-center gap-1.5">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                <span>{analytics?.average_rating ? Number(analytics.average_rating).toFixed(1) : '5.0'}</span>
              </p>
              <span className="text-[11px] text-slate-500 mt-1 block group-hover:text-emerald-400 transition-colors">From {analytics?.total_reviews || 0} verified reviews →</span>
            </Link>
          </>
        )}
      </div>

      {/* Verification Guard Alert Box */}
      {approvalStatus !== 'APPROVED' && (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-6 space-y-2 text-xs">
          <h3 className="font-bold text-amber-300 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Publishing Restrictions Active</span>
          </h3>
          <p className="text-slate-300 leading-relaxed">
            Because your business profile status is currently <span className="font-bold uppercase text-amber-400">{approvalStatus}</span>, you cannot publish public service offerings or process live consumer orders. An administrator must review your registration credentials first.
          </p>
          <div className="pt-2">
            <Link
              href="/client/profile"
              className="text-amber-400 hover:text-amber-300 font-semibold underline"
            >
              Review and update business documentation →
            </Link>
          </div>
        </div>
      )}

      {/* Recent Requests Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Recent Incoming Requests</h2>
          <Link href="/client/requests" className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1">
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
              <div
                key={ord.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-xs">{ord.order_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      ord.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      ord.status === 'ACCEPTED' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      ord.status === 'IN_PROGRESS' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    }`}>
                      {ord.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Customer: <span className="font-semibold text-white">{ord.consumer_name}</span> — {ord.items?.[0]?.item_title || 'Service Offering'}
                  </p>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <span className="text-xs font-bold text-emerald-400">${parseFloat(ord.client_earnings).toFixed(2)}</span>
                  <Link
                    href={`/client/requests?orderId=${ord.id}`}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold hover:underline"
                  >
                    Manage Request
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/client/requests"
          className="p-5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between transition-all group"
        >
          <div>
            <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Booking Requests</h3>
            <p className="text-xs text-slate-400 mt-1">Accept, decline, and update orders.</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
        </Link>

        <Link
          href="/client/services"
          className="p-5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between transition-all group"
        >
          <div>
            <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Service Offerings</h3>
            <p className="text-xs text-slate-400 mt-1">Manage public catalog and pricing.</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
        </Link>

        <Link
          href="/client/customers"
          className="p-5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between transition-all group"
        >
          <div>
            <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Customer Directory</h3>
            <p className="text-xs text-slate-400 mt-1">View client contacts and booking history.</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
        </Link>

        <Link
          href="/client/reviews"
          className="p-5 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl flex items-center justify-between transition-all group"
        >
          <div>
            <h3 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">Customer Reviews</h3>
            <p className="text-xs text-slate-400 mt-1">Monitor ratings and testimonials.</p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
        </Link>
      </div>
    </div>
  );
}

