'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Star, User, Building, Trash2 } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

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
      <PageHeader
        title="Consumer Reviews Moderation"
        description="Monitor marketplace trust, provider ratings, and qualitative consumer feedback."
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
            <Card key={r.id} hoverEffect className="p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < r.rating ? 'fill-amber-400' : 'text-zinc-700'}`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-zinc-100">({r.rating}/5)</span>
                  <span className="text-xs text-zinc-400">· Order #{r.order_number || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-zinc-400">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                  <Button
                    onClick={() => setDeletingId(r.id)}
                    variant="danger"
                    size="sm"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <p className="text-xs text-zinc-300 bg-zinc-950 p-3 rounded-xl border border-zinc-800/80">
                "{r.comment || 'No written commentary provided.'}"
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-zinc-500" />
                  Reviewer: <strong className="text-zinc-200">{r.consumer_name || 'Consumer'}</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-zinc-500" />
                  Provider: <strong className="text-indigo-400">{r.client_business_name || 'Business'}</strong>
                </span>
              </div>

              {deletingId === r.id && (
                <div className="mt-2 p-3 bg-rose-950/40 border border-rose-800/40 rounded-xl flex items-center justify-between">
                  <span className="text-xs text-rose-300 font-medium">Delete this review permanently?</span>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => setDeletingId(null)} variant="secondary" size="sm">
                      Cancel
                    </Button>
                    <Button
                      onClick={() => deleteReviewMutation.mutate(r.id)}
                      isLoading={deleteReviewMutation.isPending}
                      variant="danger"
                      size="sm"
                    >
                      Confirm Delete
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
