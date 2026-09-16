'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Star, MessageSquare, User, Filter, ShieldCheck, ShoppingBag } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton, CardSkeleton } from '@/components/ui/LoadingSkeleton';

export default function ClientReviewsPage() {
  const [ratingFilter, setRatingFilter] = useState<number>(0);

  // 1. Fetch business analytics for review totals and average rating
  const { data: analytics, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ['clientAnalyticsReviews'],
    queryFn: async () => {
      const res = await api.get('/client/analytics');
      return res.data;
    },
  });

  // 2. Fetch client orders to extract verified reviews
  const { data: orders = [], isLoading: isOrdersLoading } = useQuery({
    queryKey: ['clientOrdersWithReviews'],
    queryFn: async () => {
      const res = await api.get('/client/orders');
      return res.data;
    },
  });

  const reviews = orders
    .filter((o: any) => o.review !== null && o.review !== undefined)
    .map((o: any) => ({
      ...o.review,
      order_number: o.order_number,
      service_title: o.items?.[0]?.item_title || 'Specialized Service',
      consumer_name: o.consumer_name || 'Verified Client',
    }));

  const filteredReviews = reviews.filter((r: any) => {
    return ratingFilter === 0 || r.rating === ratingFilter;
  });

  const avgRating = analytics?.average_rating ? Number(analytics.average_rating).toFixed(1) : '5.0';
  const totalReviews = analytics?.total_reviews ?? reviews.length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
            <span>Customer Feedback & Ratings</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Verified ratings and qualitative testimonials submitted by clients following fulfilled bookings.
          </p>
        </div>

        {/* Rating Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
          >
            <option value={0}>All Ratings</option>
            <option value={5}>5 Stars</option>
            <option value={4}>4 Stars</option>
            <option value={3}>3 Stars</option>
            <option value={2}>2 Stars</option>
            <option value={1}>1 Star</option>
          </select>
        </div>
      </div>

      {/* Summary Score Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center gap-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-black text-2xl">
            {avgRating}
          </div>
          <div>
            <div className="flex items-center gap-1 text-amber-400">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-3.5 h-3.5 ${i < Math.round(Number(avgRating)) ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`}
                />
              ))}
            </div>
            <span className="text-xs text-slate-400 block mt-1 font-medium">Average Star Rating</span>
          </div>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
          <span className="text-xs text-slate-400 font-medium block">Total Verified Reviews</span>
          <p className="text-2xl font-extrabold text-white mt-1">{totalReviews}</p>
          <span className="text-[11px] text-emerald-400 mt-1 block flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> 100% Verified customer bookings
          </span>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
          <span className="text-xs text-slate-400 font-medium block">Client Trust Status</span>
          <p className="text-base font-bold text-emerald-300 mt-1">Excellent Reputation</p>
          <span className="text-[11px] text-slate-500 mt-1 block">Feedback is published live to marketplace</span>
        </div>
      </div>

      {/* Reviews List */}
      {isOrdersLoading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredReviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No customer reviews found"
          description={
            ratingFilter
              ? `No customer reviews matching ${ratingFilter} stars.`
              : 'Verified reviews will be displayed here as clients complete bookings and leave feedback.'
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredReviews.map((rev: any) => (
            <div
              key={rev.id}
              className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-xl hover:border-slate-700 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-700'}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-white">({rev.rating}/5)</span>
                  <span className="text-xs text-slate-500">·</span>
                  <span className="text-xs text-indigo-400 font-semibold">{rev.service_title}</span>
                </div>

                <span className="text-[11px] text-slate-400">
                  {new Date(rev.created_at).toLocaleDateString()}
                </span>
              </div>

              {rev.comment ? (
                <p className="text-xs text-slate-200 leading-relaxed bg-slate-800/40 p-3.5 rounded-xl border border-slate-800/80">
                  "{rev.comment}"
                </p>
              ) : (
                <p className="text-xs text-slate-500 italic">No written comment left.</p>
              )}

              <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>Client: <strong className="text-slate-200">{rev.consumer_name}</strong></span>
                </div>
                <span className="font-mono text-[11px] text-slate-500">Order #{rev.order_number}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
