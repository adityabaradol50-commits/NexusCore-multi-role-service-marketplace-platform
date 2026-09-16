'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { X, Calendar, CreditCard, Clock, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

interface BookingModalProps {
  service: any | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BookingModal({ service, isOpen, onClose, onSuccess }: BookingModalProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [quantity, setQuantity] = useState<number>(1);
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('card');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !service) return null;

  const unitPrice = parseFloat(service.price || '0');
  const totalAmount = (unitPrice * quantity).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      let formattedDate: string | undefined = undefined;
      if (scheduledAt) {
        const d = new Date(scheduledAt);
        if (isNaN(d.getTime())) {
          setErrorMessage('Please select a valid scheduled date and time.');
          setIsSubmitting(false);
          return;
        }
        formattedDate = d.toISOString();
      }

      const res = await api.post('/consumer/orders', {
        service_product_id: service.id,
        quantity,
        scheduled_at: formattedDate,
        notes: notes.trim() || undefined,
        payment_method: paymentMethod,
      });

      showToast(`Order ${res.data.order_number} created successfully!`, 'success');
      onClose();
      if (onSuccess) onSuccess();
      router.push('/consumer/orders');
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : 'Failed to place order. Please try again.';
      setErrorMessage(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
              Service Booking Request
            </span>
            <h2 className="text-base font-bold text-white mt-1 line-clamp-1">{service.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Provider Summary */}
          <div className="p-3.5 bg-slate-800/50 border border-slate-700/60 rounded-xl space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                  {service.client_service_area || 'Vetted Provider'}
                </span>
                <h3 className="font-bold text-white text-sm mt-1">{service.client_business_name || 'Vetted Partner'}</h3>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Unit Price</span>
                <span className="font-extrabold text-emerald-400 text-sm">
                  {unitPrice > 0 ? `$${unitPrice.toFixed(2)}` : 'Price on Request'}
                </span>
              </div>
            </div>
            {service.client_bio && (
              <div className="pt-2 border-t border-slate-700/40 text-[11px] text-slate-300 whitespace-pre-line leading-relaxed font-medium">
                {service.client_bio}
              </div>
            )}
          </div>

          {/* Quantity Selection */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Quantity / Scope Units</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={50}
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-28 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-sm focus:outline-none focus:border-indigo-500"
              />
              <span className="text-slate-400 text-[11px]">
                Estimated Duration: {service.duration_minutes ? `${service.duration_minutes * quantity} mins` : 'Flexible'}
              </span>
            </div>
          </div>

          {/* Preferred Date & Time */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" />
              <span>Requested Execution Schedule</span>
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">Optional: Specify your preferred appointment date and time.</span>
          </div>

          {/* Special Requests / Notes */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">Special Instructions & Requirements</label>
            <textarea
              rows={3}
              placeholder="Add specific details, delivery address notes, or scope preferences..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-slate-300 font-semibold mb-2 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
              <span>Payment Authorization Method</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'card', label: 'Credit Card', icon: '💳' },
                { id: 'bank_transfer', label: 'Bank ACH', icon: '🏦' },
                { id: 'wallet', label: 'Nexus Pay', icon: '⚡' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id)}
                  className={`p-2.5 rounded-xl border text-center transition-all ${
                    paymentMethod === m.id
                      ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="block text-base">{m.icon}</span>
                  <span className="block text-[11px] mt-0.5">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
            <div className="flex justify-between text-slate-400">
              <span>Subtotal ({quantity} {quantity === 1 ? 'item' : 'items'})</span>
              <span>${totalAmount}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Platform Escrow Protection</span>
              <span className="text-emerald-400 font-medium">Included ($0.00)</span>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-extrabold text-white">
              <span>Total Payable</span>
              <span className="text-emerald-400 text-base">${totalAmount}</span>
            </div>
          </div>

          {/* Guarantee Badge */}
          <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-indigo-950/40 border border-indigo-500/20 p-2.5 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Funds are held in secure platform escrow until service completion is confirmed.</span>
          </div>

          {/* Submit Actions */}
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-2"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Booking (${totalAmount})</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
