'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/context/ToastContext';
import { api, fetchCategories } from '@/lib/api';
import { X, Layers, AlertCircle, Save, CheckCircle2 } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              Service Catalog
            </span>
            <h2 className="text-base font-bold text-white mt-1">
              {service ? 'Edit Service Offering' : 'Add New Service Offering'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!isApproved && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Business vetting pending. Service modifications will be enabled once approved.</span>
            </div>
          )}

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Category *</label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="" disabled>Select category...</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Offering Title *</label>
            <input
              type="text"
              required
              minLength={3}
              placeholder="e.g. Full-Stack Web App Consultation"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Price ($ USD) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="150.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Duration (Minutes) *</label>
              <input
                type="number"
                min="1"
                required
                placeholder="60"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">Scope & Description *</label>
            <textarea
              rows={4}
              required
              minLength={10}
              placeholder="Detailed description of deliverable outcomes, technical stack, or project scope..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-emerald-500 leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700/60 rounded-xl">
            <div>
              <span className="font-bold text-white block">Listing Availability</span>
              <span className="text-[11px] text-slate-400">Available for public discovery and consumer booking</span>
            </div>
            <button
              type="button"
              onClick={() => setIsAvailable(!isAvailable)}
              className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                isAvailable ? 'bg-emerald-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white transition-transform transform ${
                  isAvailable ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Submit Actions */}
          <div className="pt-3 flex justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isApproved}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{service ? 'Update Listing' : 'Publish Offering'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
