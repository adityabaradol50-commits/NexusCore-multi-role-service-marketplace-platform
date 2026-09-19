'use client';

import React, { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { 
  Calendar, CreditCard, AlertCircle, Star, Ban, ShieldCheck 
} from 'lucide-react';
import ReviewModal from './ReviewModal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

interface OrderDetailModalProps {
  order: any | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated: () => void;
}

export default function OrderDetailModal({ order, isOpen, onClose, onOrderUpdated }: OrderDetailModalProps) {
  const { showToast } = useToast();
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  if (!isOpen || !order) return null;

  const handleCancelOrder = async () => {
    setIsCancelling(true);
    try {
      await api.post(`/consumer/orders/${order.id}/cancel`);
      showToast(`Order ${order.order_number} cancelled successfully.`, 'info');
      setShowCancelConfirm(false);
      onOrderUpdated();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to cancel order.';
      showToast(msg, 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Order ${order.order_number}`}
        description={`Placed on ${new Date(order.created_at).toLocaleString()}`}
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <div>
              {order.status === 'PENDING' && !showCancelConfirm && (
                <Button
                  onClick={() => setShowCancelConfirm(true)}
                  variant="danger"
                  size="sm"
                  leftIcon={<Ban className="w-3.5 h-3.5" />}
                >
                  Cancel Request
                </Button>
              )}

              {order.status === 'COMPLETED' && !order.review && (
                <Button
                  onClick={() => setShowReviewModal(true)}
                  variant="primary"
                  size="sm"
                  leftIcon={<Star className="w-3.5 h-3.5 fill-current" />}
                >
                  Write Verified Review
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {order.payment && (
                <a
                  href={`/api/v1/consumer/orders/${order.id}/receipt`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="outline" size="sm" leftIcon={<CreditCard className="w-3.5 h-3.5" />}>
                    Official Receipt
                  </Button>
                </a>
              )}
              <Button onClick={onClose} variant="secondary" size="sm">
                Close
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Status Banner */}
          <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
            <span className="text-xs text-zinc-400 font-medium">Fulfillment Status</span>
            <Badge status={order.status} size="md" />
          </div>

          {/* Service & Provider Details */}
          <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-3">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400 block">Service Offering</span>
            <div className="flex justify-between items-start gap-4">
              <div>
                <h3 className="font-semibold text-zinc-100 text-xs">{order.items?.[0]?.item_title || 'Service Offering'}</h3>
                <p className="text-zinc-400 text-xs mt-0.5">Provider: <span className="text-indigo-400 font-medium">{order.client_business_name || 'Vetted Provider'}</span></p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-zinc-400 text-[11px] block">Unit Price</span>
                <span className="font-semibold text-zinc-200 text-xs">${parseFloat(order.items?.[0]?.unit_price || order.total_amount).toFixed(2)}</span>
              </div>
            </div>
            <div className="pt-2 border-t border-zinc-800 flex justify-between text-zinc-300 text-xs">
              <span>Quantity: <strong>{order.items?.[0]?.quantity || 1}</strong></span>
              <span>Total Payable: <strong className="text-emerald-400">${parseFloat(order.total_amount).toFixed(2)}</strong></span>
            </div>
          </div>

          {/* Schedule & Payment Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
              <span className="text-zinc-400 text-[11px] flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>Scheduled Execution</span>
              </span>
              <p className="text-zinc-200 font-medium text-xs">
                {order.scheduled_at ? new Date(order.scheduled_at).toLocaleString() : 'Flexible / As Arranged'}
              </p>
            </div>

            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
              <span className="text-zinc-400 text-[11px] flex items-center gap-1.5 font-medium">
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                <span>Payment Authorization</span>
              </span>
              <p className="text-zinc-200 font-medium text-xs capitalize">
                {order.payment?.payment_method || 'Card'} — <span className="text-emerald-400 font-semibold">{order.payment?.status || 'PAID'}</span>
              </p>
            </div>
          </div>

          {/* Consumer Notes */}
          {order.notes && (
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
              <span className="text-zinc-400 text-[11px] font-medium block">Special Instructions / Notes:</span>
              <p className="text-zinc-300 italic text-xs">{order.notes}</p>
            </div>
          )}

          {/* Rejection / Cancellation Reason */}
          {order.rejection_reason && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 space-y-1 text-xs">
              <span className="font-semibold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>Reason for Status ({order.status}):</span>
              </span>
              <p>{order.rejection_reason}</p>
            </div>
          )}

          {/* Review Details (if present) */}
          {order.review && (
            <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-amber-300 flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  <span>Your Submitted Review ({order.review.rating}/5)</span>
                </span>
                <span className="text-[10px] text-zinc-400">{new Date(order.review.created_at).toLocaleDateString()}</span>
              </div>
              {order.review.comment && (
                <p className="text-zinc-300 italic">"{order.review.comment}"</p>
              )}
            </div>
          )}

          {/* Confirmation Box for Cancellation */}
          {showCancelConfirm && (
            <div className="p-3.5 bg-rose-950/40 border border-rose-500/30 rounded-xl space-y-3">
              <p className="text-rose-200 font-medium text-xs">Are you sure you want to cancel this booking request?</p>
              <div className="flex justify-end gap-2">
                <Button onClick={() => setShowCancelConfirm(false)} variant="secondary" size="sm">
                  Keep Booking
                </Button>
                <Button onClick={handleCancelOrder} variant="danger" size="sm" isLoading={isCancelling}>
                  Yes, Cancel Order
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Review Modal Trigger */}
      {showReviewModal && (
        <ReviewModal
          orderId={order.id}
          orderNumber={order.order_number}
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          onSuccess={() => {
            onOrderUpdated();
            onClose();
          }}
        />
      )}
    </>
  );
}
