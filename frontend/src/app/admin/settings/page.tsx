'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Tag, Shield, Percent, Plus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

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
    <div className="space-y-6 max-w-4xl">
      <PageHeader
        title="Platform Governance & Taxonomy Settings"
        description="Configure marketplace fee structures, taxonomy categories, and security policies."
        badgeText="System Config"
        badgeVariant="primary"
      />

      {/* Commission & Fees Card */}
      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <Percent className="w-4 h-4 text-emerald-400" />
          <span>Marketplace Commission Architecture</span>
        </h2>
        <p className="text-xs text-zinc-400">
          Global platform fee applied dynamically across all completed checkout transactions.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
            <div className="text-xs text-zinc-400 font-medium">Platform Take Rate</div>
            <div className="text-xl font-bold text-emerald-400 mt-1">10.00%</div>
            <div className="text-[11px] text-zinc-400 mt-1">Deducted from gross GMV upon order settlement</div>
          </div>
          <div className="p-4 bg-zinc-950 rounded-xl border border-zinc-800">
            <div className="text-xs text-zinc-400 font-medium">Provider Net Share</div>
            <div className="text-xl font-bold text-zinc-100 mt-1">90.00%</div>
            <div className="text-[11px] text-zinc-400 mt-1">Disbursed to client business escrow ledger</div>
          </div>
        </div>
      </Card>

      {/* Category Management */}
      <Card className="p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <Tag className="w-4 h-4 text-indigo-400" />
            <span>Marketplace Service Categories</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Manage product and service taxonomy available for clients when publishing offerings.
          </p>
        </div>

        {/* Existing Categories */}
        <div className="flex flex-wrap gap-2">
          {categories.map((c: any) => (
            <span
              key={c.id}
              className="px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 flex items-center gap-1.5"
            >
              <Tag className="w-3.5 h-3.5 text-indigo-400" />
              <span>{c.name}</span>
              <span className="text-[10px] text-zinc-400 font-mono">({c.slug})</span>
            </span>
          ))}
        </div>

        {/* Add Category Form */}
        <form onSubmit={handleCreateCategory} className="pt-4 border-t border-zinc-800 space-y-4">
          <h3 className="text-xs font-semibold text-zinc-100">Add New Service Category</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Category Name *"
              required
              value={categoryName}
              onChange={(e) => {
                setCategoryName(e.target.value);
                if (!categorySlug) {
                  setCategorySlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                }
              }}
              placeholder="e.g. Graphic Design"
            />
            <Input
              label="Slug (URL identifier) *"
              required
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              placeholder="e.g. graphic-design"
            />
          </div>

          <Input
            label="Description (Optional)"
            value={categoryDesc}
            onChange={(e) => setCategoryDesc(e.target.value)}
            placeholder="Brief description of the service domain..."
          />

          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={categoryMutation.isPending}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Create Category
          </Button>
        </form>
      </Card>

      {/* Security & Access Policies */}
      <Card className="p-6 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
          <Shield className="w-4 h-4 text-rose-400" />
          <span>Security & Access Enforcements</span>
        </h2>
        <div className="space-y-2.5 text-xs text-zinc-300">
          <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
            <div>
              <div className="font-semibold text-zinc-100">Client Business KYC Verification Gate</div>
              <div className="text-[11px] text-zinc-400">Strictly block unapproved clients from publishing services or taking payments</div>
            </div>
            <Badge variant="success" size="sm">ENFORCED</Badge>
          </div>

          <div className="flex items-center justify-between p-3 bg-zinc-950 rounded-xl border border-zinc-800">
            <div>
              <div className="font-semibold text-zinc-100">JWT Access & Refresh Token Security</div>
              <div className="text-[11px] text-zinc-400">RFC 7519 jti unique token invalidation and sliding sessions</div>
            </div>
            <Badge variant="success" size="sm">ACTIVE</Badge>
          </div>
        </div>
      </Card>
    </div>
  );
}
