'use client';

import React, { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { Star, AlertCircle, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

interface ReviewModalProps {
  orderId: string | null;
  orderNumber?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReviewModal({ orderId, orderNumber, isOpen, onClose, onSuccess }: ReviewModalProps) {
  const { showToast } = useToast();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !orderId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await api.post(`/consumer/orders/${orderId}/review`, {
        rating,
        comment: comment.trim() || undefined,
      });

      showToast('Review submitted successfully! Thank you for your feedback.', 'success');
      onClose();
      onSuccess();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : 'Failed to submit review.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Review Order ${orderNumber || ''}`}
      description="Share your verified experience with the service provider."
      maxWidth="md"
      footer={
        <>
          <Button onClick={onClose} variant="secondary" size="sm">
            Cancel
          </Button>
          <Button
            type="submit"
            form="review-form"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            leftIcon={<Send className="w-3.5 h-3.5" />}
          >
            Submit Review
          </Button>
        </>
      }
    >
      <form id="review-form" onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Star Selection */}
        <div className="text-center space-y-2 py-3 bg-zinc-950 border border-zinc-800 rounded-xl">
          <span className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider">Overall Rating</span>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = (hoverRating || rating) >= star;
              return (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 transition-transform hover:scale-110 focus:outline-none cursor-pointer"
                >
                  <Star
                    className={`w-7 h-7 ${
                      active ? 'fill-amber-400 text-amber-400' : 'text-zinc-700 hover:text-zinc-500'
                    }`}
                  />
                </button>
              );
            })}
          </div>
          <span className="text-xs font-bold text-amber-400 block">
            {rating === 5 ? '5/5 — Excellent' : rating === 4 ? '4/5 — Very Good' : rating === 3 ? '3/5 — Average' : rating === 2 ? '2/5 — Below Expectation' : '1/5 — Poor'}
          </span>
        </div>

        {/* Comment Text Area */}
        <Textarea
          label="Your Detailed Experience & Feedback"
          rows={4}
          placeholder="Share details about quality, timeliness, and communication..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </form>
    </Modal>
  );
}
