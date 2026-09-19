'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/context/ToastContext';
import { api, fetchCategories } from '@/lib/api';
import { AlertCircle, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

interface ServiceModalProps {
  service: any | null;
  isOpen: boolean;
  isApproved: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ServiceModal({ service, isOpen, isApproved, onClose, onSuccess }: ServiceModalProps) {
  const { showToast } = useToast();

  const [categoryId, setCategoryId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [isAvailable, setIsAvailable] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({
    queryKey: ['serviceModalCategories'],
    queryFn: fetchCategories,
  });

  useEffect(() => {
    if (service) {
      setCategoryId(service.category_id || service.category?.id || '');
      setTitle(service.title || '');
      setDescription(service.description || '');
      setPrice(service.price ? String(service.price) : '');
      setDurationMinutes(service.duration_minutes ? String(service.duration_minutes) : '60');
      setIsAvailable(service.is_available !== undefined ? service.is_available : true);
    } else {
      setCategoryId(categories.length > 0 ? categories[0].id : '');
      setTitle('');
      setDescription('');
      setPrice('');
      setDurationMinutes('60');
      setIsAvailable(true);
    }
  }, [service, categories]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isApproved) {
      setErrorMessage('Your account must be APPROVED before publishing or modifying service offerings.');
      return;
    }

    if (!categoryId) {
      setErrorMessage('Please select a valid category.');
      return;
    }

    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum <= 0) {
      setErrorMessage('Please enter a valid price greater than $0.00.');
      return;
    }

    const durationNum = parseInt(durationMinutes);
    if (isNaN(durationNum) || durationNum <= 0) {
      setErrorMessage('Please enter a valid duration in minutes.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        category_id: categoryId,
        title: title.trim(),
        description: description.trim(),
        price: priceNum,
        duration_minutes: durationNum,
        is_available: isAvailable,
      };

      if (service) {
        await api.put(`/client/services/${service.id}`, payload);
        showToast('Service offering updated successfully', 'success');
      } else {
        await api.post('/client/services', payload);
        showToast('New service offering created successfully', 'success');
      }

      onClose();
      onSuccess();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : 'Failed to save service offering.';
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
      title={service ? 'Edit Service Offering' : 'Add New Service Offering'}
      description="Configure public catalog listing details, pricing, and fulfillment parameters."
      maxWidth="lg"
      footer={
        <>
          <Button onClick={onClose} variant="secondary" size="sm">
            Cancel
          </Button>
          <Button
            type="submit"
            form="service-form"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            disabled={!isApproved}
            leftIcon={<Save className="w-4 h-4" />}
          >
            {service ? 'Update Listing' : 'Publish Offering'}
          </Button>
        </>
      }
    >
      <form id="service-form" onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {!isApproved && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 flex items-center gap-2 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Business vetting pending. Service modifications will be enabled once approved.</span>
          </div>
        )}

        <Select
          label="Category *"
          required
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="" disabled>Select category...</option>
          {categories.map((c: any) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <Input
          label="Offering Title *"
          type="text"
          required
          minLength={3}
          placeholder="e.g. Wellness Consultation"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Price ($ USD) *"
            type="number"
            step="0.01"
            min="0.01"
            required
            placeholder="150.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <Input
            label="Duration (Minutes) *"
            type="number"
            min="1"
            required
            placeholder="60"
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(e.target.value)}
          />
        </div>

        <Textarea
          label="Scope & Description *"
          rows={4}
          required
          minLength={10}
          placeholder="Detailed description of deliverable outcomes or session scope..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="flex items-center justify-between p-3 bg-zinc-950 border border-zinc-800 rounded-xl">
          <div>
            <span className="font-semibold text-zinc-100 text-xs block">Listing Availability</span>
            <span className="text-[11px] text-zinc-400">Available for public discovery and consumer booking</span>
          </div>
          <button
            type="button"
            onClick={() => setIsAvailable(!isAvailable)}
            className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 cursor-pointer ${
              isAvailable ? 'bg-indigo-600' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full bg-white transition-transform transform ${
                isAvailable ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </form>
    </Modal>
  );
}
