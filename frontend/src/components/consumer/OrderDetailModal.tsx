'use client';

import React, { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { 
  X, Calendar, Clock, CreditCard, ShoppingBag, 
  CheckCircle2, AlertCircle, Star, Ban, ShieldCheck 
} from 'lucide-react';
import ReviewModal from './ReviewModal';

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'ACCEPTED':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'IN_PROGRESS':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'CANCELLED':
      case 'REJECTED':
        return 'bg-rose-500/20 text-rose-400 border-rose-500/30';
      default:
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header */}
          <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-extrabold text-white text-sm">{order.order_number}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(order.status)}`}>
                  {order.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">Placed on {new Date(order.created_at).toLocaleString()}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
            {/* Service & Provider */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block">Service Offering</span>
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h3 className="font-bold text-white text-sm">{order.items?.[0]?.item_title || 'Service Offering'}</h3>
                  <p className="text-slate-400 mt-0.5">Provider: <span className="text-indigo-400 font-semibold">{order.client_business_name || 'Vetted Provider'}</span></p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-slate-400 text-[11px] block">Unit Price</span>
                  <span className="font-bold text-slate-200">${parseFloat(order.items?.[0]?.unit_price || order.total_amount).toFixed(2)}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-slate-300 text-[11px]">
                <span>Quantity: <strong>{order.items?.[0]?.quantity || 1}</strong></span>
                <span>Total: <strong className="text-emerald-400">${parseFloat(order.total_amount).toFixed(2)}</strong></span>
              </div>
            </div>

            {/* Schedule & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 bg-slate-800/40 border border-slate-800 rounded-xl space-y-1">
                <span className="text-slate-400 text-[11px] flex items-center gap-1 font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Scheduled Execution</span>
                </span>
                <p className="text-slate-200 font-medium">
                  {order.scheduled_at ? new Date(order.scheduled_at).toLocaleString() : 'Flexible / As Arranged'}
                </p>
              </div>

              <div className="p-3.5 bg-slate-800/40 border border-slate-800 rounded-xl space-y-1">
                <span className="text-slate-400 text-[11px] flex items-center gap-1 font-semibold">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Payment Authorization</span>
                </span>
                <p className="text-slate-200 font-medium capitalize">
                  {order.payment?.payment_method || 'Card'} — <span className="text-emerald-400 font-bold">{order.payment?.status || 'PAID'}</span>
                </p>
              </div>
            </div>

            {/* Consumer Notes */}
            {order.notes && (
              <div className="p-3.5 bg-slate-800/30 border border-slate-800 rounded-xl space-y-1">
                <span className="text-slate-400 text-[11px] font-semibold block">Special Instructions / Notes:</span>
                <p className="text-slate-300 italic">{order.notes}</p>
              </div>
            )}

            {/* Rejection / Cancellation Reason */}
            {order.rejection_reason && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 space-y-1">
                <span className="font-bold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Reason for Status ({order.status}):</span>
                </span>
                <p>{order.rejection_reason}</p>
              </div>
            )}

            {/* Review Details (if present) */}
            {order.review && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>Your Submitted Review ({order.review.rating}/5)</span>
                  </span>
                  <span className="text-[10px] text-slate-500">{new Date(order.review.created_at).toLocaleDateString()}</span>
                </div>
                {order.review.comment && (
                  <p className="text-slate-300 text-xs italic">"{order.review.comment}"</p>
                )}
              </div>
            )}

            {/* Confirmation Box for Cancellation */}
            {showCancelConfirm && (
              <div className="p-4 bg-rose-950/60 border border-rose-500/40 rounded-xl space-y-3">
                <p className="text-rose-200 font-semibold">Are you sure you want to cancel this booking request?</p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-medium"
                  >
                    Keep Booking
                  </button>
                  <button
                    onClick={handleCancelOrder}
                    disabled={isCancelling}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold shadow"
                  >
                    {isCancelling ? 'Cancelling...' : 'Yes, Cancel Order'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex justify-between items-center">
            <div>
              {order.status === 'PENDING' && !showCancelConfirm && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Cancel Request</span>
                </button>
              )}

              {order.status === 'COMPLETED' && !order.review && (
                <button
                  onClick={() => setShowReviewModal(true)}
                  className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>Write Verified Review</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {order.payment && (
                <a
                  href={`/api/v1/consumer/orders/${order.id}/receipt`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>View Official Receipt</span>
                </a>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

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
