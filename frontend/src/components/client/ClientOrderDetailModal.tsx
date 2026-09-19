'use client';

import React, { useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { 
  Calendar, CreditCard, Mail, CheckCircle2, AlertCircle, Star, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

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

  const grossAmount = parseFloat(order.total_amount || '0');
  const clientEarnings = parseFloat(order.client_earnings || '0');
  const platformFee = parseFloat(order.platform_fee || '0');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Request ${order.order_number}`}
      description={`Received on ${new Date(order.created_at).toLocaleString()}`}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {order.status === 'PENDING' && !showDeclineConfirm && (
              <>
                <Button
                  onClick={() => handleUpdateStatus('ACCEPTED')}
                  isLoading={isSubmitting}
                  variant="primary"
                  size="sm"
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  Accept Booking
                </Button>
                <Button
                  onClick={() => setShowDeclineConfirm(true)}
                  disabled={isSubmitting}
                  variant="danger"
                  size="sm"
                >
                  Decline
                </Button>
              </>
            )}

            {order.status === 'ACCEPTED' && (
              <Button
                onClick={() => handleUpdateStatus('IN_PROGRESS')}
                isLoading={isSubmitting}
                variant="secondary"
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Start Progress
              </Button>
            )}

            {order.status === 'IN_PROGRESS' && (
              <Button
                onClick={() => handleUpdateStatus('COMPLETED')}
                isLoading={isSubmitting}
                variant="success"
                size="sm"
                leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                Complete & Settle (${clientEarnings.toFixed(2)})
              </Button>
            )}
          </div>

          <Button onClick={onClose} variant="secondary" size="sm">
            Close
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Status Header */}
        <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
          <span className="text-xs text-zinc-400 font-medium">Order Status</span>
          <Badge status={order.status} size="md" />
        </div>

        {/* Customer Info */}
        <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400 block">Customer Information</span>
          <h3 className="font-semibold text-zinc-100 text-xs">{order.consumer_name || 'Verified Consumer'}</h3>
          <p className="text-zinc-400 text-xs flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-indigo-400" />
            {order.consumer_email || 'N/A'}
          </p>
        </div>

        {/* Scope Breakdown */}
        <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 block">Requested Scope & Item</span>
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold text-zinc-100 text-xs">{order.items?.[0]?.item_title || 'Service Offering'}</h4>
              <p className="text-zinc-400 text-xs mt-0.5">Quantity: {order.items?.[0]?.quantity || 1}</p>
            </div>
            <span className="font-bold text-zinc-100 text-xs">${grossAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Financial Breakdown (90% Owner Share / 10% Fee) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
            <span className="text-zinc-400 text-[11px] flex items-center gap-1.5 font-medium">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Execution Schedule</span>
            </span>
            <p className="text-zinc-200 font-medium text-xs">
              {order.scheduled_at ? new Date(order.scheduled_at).toLocaleString() : 'Flexible Schedule'}
            </p>
          </div>

          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
            <span className="text-zinc-400 text-[11px] flex items-center gap-1.5 font-medium">
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              <span>Net Owner Share (90%)</span>
            </span>
            <p className="text-emerald-400 font-bold text-xs">
              ${clientEarnings.toFixed(2)} <span className="text-[10px] text-zinc-500 font-normal">(${platformFee.toFixed(2)} fee)</span>
            </p>
          </div>
        </div>

        {/* Customer Notes */}
        {order.notes && (
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
            <span className="text-zinc-400 text-[11px] font-medium block">Customer Notes / Requirements:</span>
            <p className="text-zinc-300 italic text-xs">{order.notes}</p>
          </div>
        )}

        {/* Rejection Reason */}
        {order.rejection_reason && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 space-y-1 text-xs">
            <span className="font-semibold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Decline Reason:</span>
            </span>
            <p>{order.rejection_reason}</p>
          </div>
        )}

        {/* Review */}
        {order.review && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1 text-xs">
            <span className="font-semibold text-amber-300 flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>Customer Verified Review ({order.review.rating}/5)</span>
            </span>
            {order.review.comment && (
              <p className="text-zinc-300 italic">"{order.review.comment}"</p>
            )}
          </div>
        )}

        {/* Decline Confirmation */}
        {showDeclineConfirm && (
          <div className="p-3.5 bg-rose-950/40 border border-rose-500/30 rounded-xl space-y-3">
            <Input
              label="Reason for Declining Request *"
              placeholder="Specify reason for decline..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <Button onClick={() => setShowDeclineConfirm(false)} variant="secondary" size="sm">
                Cancel
              </Button>
              <Button
                onClick={() => handleUpdateStatus('REJECTED', rejectionReason)}
                isLoading={isSubmitting}
                variant="danger"
                size="sm"
              >
                Confirm Decline
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
