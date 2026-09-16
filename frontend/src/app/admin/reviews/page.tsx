'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Star, MessageSquare, User, Building, Trash2, Filter } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [ratingFilter, setRatingFilter] = useState<number | 0>(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['adminReviewsList'],
    queryFn: async () => {
      const res = await api.get('/admin/reviews');
      return res.data;
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const res = await api.delete(`/admin/reviews/${reviewId}`);
      return res.data;
    },
    onSuccess: () => {
      addToast('Review deleted by administrator.', 'info');
      queryClient.invalidateQueries({ queryKey: ['adminReviewsList'] });
      setDeletingId(null);
    },
    onError: (err: any) => {
      addToast(err.response?.data?.detail || 'Failed to delete review', 'error');
    },
  });

  const filteredReviews = reviews.filter((r: any) => {
    return ratingFilter === 0 || r.rating === ratingFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Star className="w-6 h-6 text-amber-400 fill-amber-400" />
            Consumer Reviews & Moderation
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Monitor marketplace trust, provider service ratings, and qualitative consumer feedback.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
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

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : filteredReviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No Reviews Found"
          description={ratingFilter ? `No reviews with ${ratingFilter} star rating.` : 'Customer reviews submitted following completed orders will be available for administrative moderation here.'}
        />
      ) : (
        <div className="space-y-3">
          {filteredReviews.map((r: any) => (
            <div
              key={r.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl transition-all hover:border-slate-700"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < r.rating ? 'fill-amber-400' : 'text-slate-700'}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-white">({r.rating}/5)</span>
                  <span className="text-xs text-slate-400">· Order #{r.order_number || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-400">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => setDeletingId(r.id)}
                    className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-lg text-xs"
                    title="Delete Review"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-300 mt-3 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                "{r.comment || 'No written commentary provided.'}"
              </p>

              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  Reviewer: <strong className="text-slate-200">{r.consumer_name || 'Consumer'}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-500" />
                  Provider: <strong className="text-indigo-400">{r.client_business_name || 'Business'}</strong>
                </span>
              </div>

              {/* Deletion Confirmation */}
              {deletingId === r.id && (
                <div className="mt-3 p-3 bg-rose-950/40 border border-rose-800/40 rounded-xl flex items-center justify-between">
                  <span className="text-xs text-rose-300 font-medium">Delete this review permanently?</span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setDeletingId(null)} className="px-2.5 py-1 text-xs text-slate-300 bg-slate-800 rounded-lg">Cancel</button>
                    <button
                      onClick={() => deleteReviewMutation.mutate(r.id)}
                      disabled={deleteReviewMutation.isPending}
                      className="px-2.5 py-1 text-xs text-white font-bold bg-rose-600 rounded-lg"
                    >
                      Confirm Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
