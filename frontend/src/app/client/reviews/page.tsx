'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Star, User, ShieldCheck } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { StatCard } from '@/components/ui/StatCard';
import { Select } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

export default function ClientReviewsPage() {
  const [ratingFilter, setRatingFilter] = useState<number>(0);

  const { data: analytics, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ['clientAnalyticsReviews'],
    queryFn: async () => {
      const res = await api.get('/client/analytics');
      return res.data;
    },
  });

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
      <PageHeader
        title="Customer Ratings & Feedback"
        description="Verified ratings and qualitative testimonials submitted by clients following fulfilled bookings."
        actions={
          <div className="w-40">
            <Select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(Number(e.target.value))}
            >
              <option value={0}>All Ratings</option>
              <option value={5}>5 Stars</option>
              <option value={4}>4 Stars</option>
              <option value={3}>3 Stars</option>
              <option value={2}>2 Stars</option>
              <option value={1}>1 Star</option>
            </Select>
          </div>
        }
      />

      {/* Summary Score Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Average Star Rating"
          value={`${avgRating} / 5`}
          subtitle="Across all completed bookings"
          changeType="positive"
          icon={<Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
          iconBg="bg-amber-500/10 border-amber-500/20"
        />

        <StatCard
          title="Total Verified Reviews"
          value={totalReviews}
          subtitle="100% verified customer orders"
          changeType="positive"
          icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
          iconBg="bg-emerald-500/10 border-emerald-500/20"
        />

        <StatCard
          title="Client Trust Status"
          value="Excellent"
          subtitle="Published live to marketplace catalog"
          changeType="positive"
          icon={<ShieldCheck className="w-4 h-4 text-indigo-400" />}
          iconBg="bg-indigo-500/10 border-indigo-500/20"
        />
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
            <Card key={rev.id} hoverEffect className="p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-zinc-100">({rev.rating}/5)</span>
                  <span className="text-xs text-zinc-500">·</span>
                  <span className="text-xs text-indigo-400 font-semibold">{rev.service_title}</span>
                </div>

                <span className="text-[11px] text-zinc-400">
                  {new Date(rev.created_at).toLocaleDateString()}
                </span>
              </div>

              {rev.comment ? (
                <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950 p-3.5 rounded-xl border border-zinc-800">
                  "{rev.comment}"
                </p>
              ) : (
                <p className="text-xs text-zinc-500 italic">No written comment left.</p>
              )}

              <div className="flex items-center justify-between pt-1 text-xs text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Client: <strong className="text-zinc-200">{rev.consumer_name}</strong></span>
                </div>
                <span className="font-mono text-[11px] text-zinc-500">Order #{rev.order_number}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
