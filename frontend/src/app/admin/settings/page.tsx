'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Settings, Tag, Shield, Percent, Plus, FolderPlus, CheckCircle2 } from 'lucide-react';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [categoryName, setCategoryName] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categoriesList'],
    queryFn: async () => {
      const res = await api.get('/public/categories');
      return res.data;
    },
  });

  const categoryMutation = useMutation({
    mutationFn: async (payload: { name: string; slug: string; description?: string }) => {
      const res = await api.post('/admin/categories', payload);
      return res.data;
    },
    onSuccess: () => {
      addToast('New category created successfully!', 'success');
      queryClient.invalidateQueries({ queryKey: ['categoriesList'] });
      setCategoryName('');
      setCategorySlug('');
      setCategoryDesc('');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.detail || 'Failed to create category', 'error');
    },
  });

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName || !categorySlug) {
      addToast('Category name and slug are required', 'error');
      return;
    }
    categoryMutation.mutate({
      name: categoryName,
      slug: categorySlug,
      description: categoryDesc,
    });
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-400" />
          Platform Settings & Governance
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Configure marketplace fee structures, taxonomy categories, and security parameters.
        </p>
      </div>

      {/* Commission & Fees Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Percent className="w-4 h-4 text-emerald-400" />
          Marketplace Commission Architecture
        </h2>
        <p className="text-xs text-slate-400">
          Global platform fee applied dynamically across all completed checkout transactions.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400">Platform Take Rate</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">10.00%</div>
            <div className="text-[11px] text-slate-500 mt-1">Deducted from gross GMV upon order settlement</div>
          </div>
          <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-800">
            <div className="text-xs text-slate-400">Provider Net Share</div>
            <div className="text-xl font-bold text-white mt-1">90.00%</div>
            <div className="text-[11px] text-slate-500 mt-1">Disbursed to client business escrow ledger</div>
          </div>
        </div>
      </div>

      {/* Category Management */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-400" />
            Marketplace Service Categories
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage product and service taxonomy available for clients when publishing offerings.
          </p>
        </div>

        {/* Existing Categories */}
        <div className="flex flex-wrap gap-2">
          {categories.map((c: any) => (
            <span
              key={c.id}
              className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 flex items-center gap-1.5"
            >
              <Tag className="w-3 h-3 text-indigo-400" />
              {c.name}
              <span className="text-[10px] text-slate-500 font-mono">({c.slug})</span>
            </span>
          ))}
        </div>

        {/* Add Category Form */}
        <form onSubmit={handleCreateCategory} className="pt-4 border-t border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
            <FolderPlus className="w-4 h-4 text-indigo-400" />
            Add New Service Category
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Category Name</label>
              <input
                type="text"
                required
                value={categoryName}
                onChange={(e) => {
                  setCategoryName(e.target.value);
                  if (!categorySlug) {
                    setCategorySlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                  }
                }}
                placeholder="e.g. Graphic Design"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Slug (URL identifier)</label>
              <input
                type="text"
                required
                value={categorySlug}
                onChange={(e) => setCategorySlug(e.target.value)}
                placeholder="e.g. graphic-design"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Description (Optional)</label>
            <input
              type="text"
              value={categoryDesc}
              onChange={(e) => setCategoryDesc(e.target.value)}
              placeholder="Brief description of the service domain..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={categoryMutation.isPending}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {categoryMutation.isPending ? 'Creating...' : 'Create Category'}
          </button>
        </form>
      </div>

      {/* Security & Access Policies */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-rose-400" />
          Security & Access Enforcements
        </h2>
        <div className="space-y-3 text-xs text-slate-300">
          <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-800">
            <div>
              <div className="font-medium text-white">Client Business KYC Verification Gate</div>
              <div className="text-[11px] text-slate-400">Strictly block unapproved clients from publishing services or taking payments</div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg font-bold text-[10px]">
              ENFORCED
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-800">
            <div>
              <div className="font-medium text-white">JWT Access & Refresh Rotation</div>
              <div className="text-[11px] text-slate-400">RFC 7519 jti unique token invalidation and automated sliding sessions</div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg font-bold text-[10px]">
              ACTIVE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
