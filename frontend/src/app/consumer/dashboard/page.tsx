'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { ShoppingBag, Clock, CheckCircle2, ArrowRight, Search, Star } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';

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
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 p-6 sm:p-8 rounded-2xl border border-indigo-500/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-xl">
        <div>
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Welcome back</span>
          <h1 className="text-2xl font-black text-white mt-1">{user?.first_name} {user?.last_name}</h1>
          <p className="text-xs text-slate-400 mt-1">Manage your active service requests and track fulfillment updates in real time.</p>
        </div>
        <Link
          href="/consumer/browse"
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 flex items-center gap-2 transition-all shrink-0"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Browse Offerings</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : (
          <>
            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400 block font-medium">Active Requests</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-extrabold text-amber-400">{activeOrders.length}</span>
                <Clock className="w-5 h-5 text-slate-600" />
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Pending provider acceptance or in progress</span>
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400 block font-medium">Completed Bookings</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-extrabold text-emerald-400">{completedOrders.length}</span>
                <CheckCircle2 className="w-5 h-5 text-slate-600" />
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Successfully fulfilled and delivered</span>
            </div>

            <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-xs text-slate-400 block font-medium">Verified Reviews</span>
              <div className="flex items-baseline justify-between mt-2">
                <span className="text-2xl font-extrabold text-indigo-400">{reviewedCount}</span>
                <Star className="w-5 h-5 text-slate-600" />
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">Ratings left for completed services</span>
            </div>
          </>
        )}
      </div>

      {/* Recent Activity List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white">Recent Service Requests</h2>
          <Link href="/consumer/orders" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1">
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {orders.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No orders yet"
            description="You haven't requested any services or products yet. Browse available catalog items to create your first booking."
            actionText="Explore Services"
            onAction={() => { window.location.href = '/consumer/browse'; }}
          />
        ) : (
          <div className="grid gap-3">
            {orders.slice(0, 5).map((ord: any) => (
              <div
                key={ord.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">{ord.order_number}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      ord.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      ord.status === 'ACCEPTED' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      ord.status === 'IN_PROGRESS' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {ord.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">{ord.items?.[0]?.item_title || 'Service Offering'}</p>
                </div>

                <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                  <span className="text-xs font-bold text-emerald-400">${parseFloat(ord.total_amount).toFixed(2)}</span>
                  <Link
                    href={`/consumer/orders?orderId=${ord.id}`}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold hover:underline"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
