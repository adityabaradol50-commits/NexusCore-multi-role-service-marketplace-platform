'use client';

import React, { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { 
  X, Calendar, CreditCard, ShoppingBag, User, Mail, Phone,
  CheckCircle2, AlertCircle, Star, Ban, ShieldCheck, ArrowRight
} from 'lucide-react';

interface ClientOrderDetailModalProps {
  order: any | null;
  isOpen: boolean;
  onClose: () => void;
  onOrderUpdated: () => void;
}

export default function ClientOrderDetailModal({ order, isOpen, onClose, onOrderUpdated }: ClientOrderDetailModalProps) {
  const { showToast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeclineConfirm, setShowDeclineConfirm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  if (!isOpen || !order) return null;

  const handleUpdateStatus = async (status: string, reason?: string) => {
    setIsSubmitting(true);
    try {
      await api.patch(`/client/orders/${order.id}/status`, {
        status,
        rejection_reason: reason || undefined,
      });
      showToast(`Order #${order.order_number} status updated to ${status}`, 'success');
      setShowDeclineConfirm(false);
      onOrderUpdated();
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to update order status.';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
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

  const grossAmount = parseFloat(order.total_amount || '0');
  const clientEarnings = parseFloat(order.client_earnings || '0');
  const platformFee = parseFloat(order.platform_fee || '0');

  return (
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
            <p className="text-[11px] text-slate-400 mt-0.5">Received on {new Date(order.created_at).toLocaleString()}</p>
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
          {/* Customer Summary Card */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">Customer Information</span>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-white text-sm">{order.consumer_name || 'Verified Consumer'}</h3>
                <div className="flex items-center gap-3 text-slate-400 text-[11px] mt-1">
                  <span className="flex items-center gap-1">
                    <Mail className="w-3 h-3 text-indigo-400" />
                    {order.consumer_email || 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Offering & Items Breakdown */}
          <div className="p-4 bg-slate-800/40 border border-slate-800 rounded-xl space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Requested Scope & Item</span>
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-white text-xs">{order.items?.[0]?.item_title || 'Service Offering'}</h4>
                <p className="text-slate-400 text-[11px] mt-0.5">Quantity: {order.items?.[0]?.quantity || 1}</p>
              </div>
              <span className="font-bold text-white text-sm">${grossAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Schedule & Financial Net Earnings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-slate-800/40 border border-slate-800 rounded-xl space-y-1">
              <span className="text-slate-400 text-[11px] flex items-center gap-1 font-semibold">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>Execution Schedule</span>
              </span>
              <p className="text-slate-200 font-medium">
                {order.scheduled_at ? new Date(order.scheduled_at).toLocaleString() : 'Flexible Schedule'}
              </p>
            </div>

            <div className="p-3.5 bg-slate-800/40 border border-slate-800 rounded-xl space-y-1">
              <span className="text-slate-400 text-[11px] flex items-center gap-1 font-semibold">
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                <span>Net Earnings (90%)</span>
              </span>
              <p className="text-emerald-400 font-extrabold text-sm">
                ${clientEarnings.toFixed(2)} <span className="text-[10px] text-slate-500 font-normal">(${platformFee.toFixed(2)} platform fee)</span>
              </p>
            </div>
          </div>

          {/* Customer Special Instructions */}
          {order.notes && (
            <div className="p-3.5 bg-slate-800/30 border border-slate-800 rounded-xl space-y-1">
              <span className="text-slate-400 text-[11px] font-semibold block">Customer Notes / Requirements:</span>
              <p className="text-slate-300 italic">{order.notes}</p>
            </div>
          )}

          {/* Rejection Reason if present */}
          {order.rejection_reason && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Decline Reason:</span>
              </span>
              <p>{order.rejection_reason}</p>
            </div>
          )}

          {/* Review if completed */}
          {order.review && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>Customer Verified Review ({order.review.rating}/5)</span>
              </span>
              {order.review.comment && (
                <p className="text-slate-300 text-xs italic">"{order.review.comment}"</p>
              )}
            </div>
          )}

          {/* Decline Confirmation Input Box */}
          {showDeclineConfirm && (
            <div className="p-4 bg-rose-950/60 border border-rose-500/40 rounded-xl space-y-3">
              <label className="block text-rose-200 font-bold text-xs">Reason for Declining Request</label>
              <input
                type="text"
                placeholder="Specify reason for decline (e.g. Schedule conflict)..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-rose-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeclineConfirm(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateStatus('REJECTED', rejectionReason)}
                  disabled={isSubmitting}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold shadow"
                >
                  Confirm Decline
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Workflow Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex justify-between items-center">
          <div className="flex items-center gap-2">
            {order.status === 'PENDING' && !showDeclineConfirm && (
              <>
                <button
                  onClick={() => handleUpdateStatus('ACCEPTED')}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold shadow flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Accept Booking</span>
                </button>
                <button
                  onClick={() => setShowDeclineConfirm(true)}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-rose-900 text-rose-300 border border-rose-500/20 rounded-xl font-semibold"
                >
                  Decline
                </button>
              </>
            )}

            {order.status === 'ACCEPTED' && (
              <button
                onClick={() => handleUpdateStatus('IN_PROGRESS')}
                disabled={isSubmitting}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow flex items-center gap-1.5"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Start Progress</span>
              </button>
            )}

            {order.status === 'IN_PROGRESS' && (
              <button
                onClick={() => handleUpdateStatus('COMPLETED')}
                disabled={isSubmitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Complete & Settle (${clientEarnings.toFixed(2)})</span>
              </button>
            )}
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
