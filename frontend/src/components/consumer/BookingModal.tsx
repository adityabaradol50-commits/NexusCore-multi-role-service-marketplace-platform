'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { Calendar, CreditCard, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Service Booking Request"
      description={service.title}
      maxWidth="lg"
      footer={
        <>
          <Button onClick={onClose} variant="secondary" size="sm">
            Cancel
          </Button>
          <Button
            type="submit"
            form="booking-form"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            leftIcon={<CheckCircle2 className="w-4 h-4" />}
          >
            Confirm Booking (${totalAmount})
          </Button>
        </>
      }
    >
      <form id="booking-form" onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Provider Summary */}
        <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <Badge variant="primary" size="sm">
                {service.client_service_area || 'Vetted Provider'}
              </Badge>
              <h3 className="font-semibold text-zinc-100 text-xs mt-1">{service.client_business_name || 'Vetted Partner'}</h3>
            </div>
            <div className="text-right">
              <span className="text-[11px] text-zinc-400 block">Unit Price</span>
              <span className="font-bold text-emerald-400 text-sm">
                {unitPrice > 0 ? `$${unitPrice.toFixed(2)}` : 'Inquire'}
              </span>
            </div>
          </div>
          {service.client_bio && (
            <p className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-400 whitespace-pre-line leading-relaxed">
              {service.client_bio}
            </p>
          )}
        </div>

        {/* Quantity Selection */}
        <div className="space-y-1">
          <Input
            label="Quantity / Units *"
            type="number"
            min={1}
            max={50}
            required
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            helperText={`Estimated Duration: ${service.duration_minutes ? `${service.duration_minutes * quantity} mins` : 'Flexible'}`}
          />
        </div>

        {/* Preferred Date & Time */}
        <Input
          label="Requested Execution Schedule"
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          leftIcon={<Calendar className="w-4 h-4 text-zinc-400" />}
          helperText="Optional: Specify your preferred appointment date and time."
        />

        {/* Special Requests / Notes */}
        <Textarea
          label="Special Instructions & Requirements"
          rows={3}
          placeholder="Add specific details, delivery address notes, or scope preferences..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {/* Payment Method */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-zinc-300 flex items-center gap-1.5">
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
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  paymentMethod === m.id
                    ? 'bg-indigo-600/10 border-indigo-500 text-white font-semibold'
                    : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span className="block text-sm">{m.icon}</span>
                <span className="block text-[11px] mt-0.5">{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1.5 text-xs">
          <div className="flex justify-between text-zinc-400">
            <span>Subtotal ({quantity} {quantity === 1 ? 'unit' : 'units'})</span>
            <span className="text-zinc-200 font-medium">${totalAmount}</span>
          </div>
          <div className="flex justify-between text-zinc-400">
            <span>Platform Escrow Protection</span>
            <span className="text-emerald-400 font-medium">Included ($0.00)</span>
          </div>
          <div className="pt-2 border-t border-zinc-800 flex justify-between text-xs font-bold text-zinc-100">
            <span>Total Payable</span>
            <span className="text-emerald-400 text-sm">${totalAmount}</span>
          </div>
        </div>

        {/* Guarantee Badge */}
        <div className="flex items-center gap-2 text-[11px] text-zinc-400 bg-indigo-500/10 border border-indigo-500/20 p-2.5 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>Funds are held in secure platform escrow until service completion is confirmed.</span>
        </div>
      </form>
    </Modal>
  );
}
