'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Layers, Tag, DollarSign, Building, CheckCircle2, XCircle, Search, EyeOff, AlertTriangle } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

export default function AdminServicesPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['adminServicesList'],
    queryFn: async () => {
      const res = await api.get('/admin/services');
      return res.data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categoriesListPublic'],
    queryFn: async () => {
      const res = await api.get('/public/categories');
      return res.data;
    },
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      const res = await api.patch(`/admin/services/${serviceId}/toggle`);
      return res.data;
    },
    onSuccess: (data) => {
      addToast(`Service availability toggled to ${data.is_available ? 'Active' : 'Hidden'}`, 'info');
      queryClient.invalidateQueries({ queryKey: ['adminServicesList'] });
    },
    onError: (err: any) => {
      addToast(err.response?.data?.detail || 'Failed to toggle service availability', 'error');
    },
  });

  // Client-side filtering
  const filteredServices = services.filter((s: any) => {
    const matchesSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.client_business_name?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || s.category_name === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-400" />
            Global Services & Products Catalog
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse and monitor all offerings published by business clients across the platform.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Selector */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Categories</option>
            {categories.map((c: any) => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>

          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search catalog..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : filteredServices.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No Services Found"
          description={search || categoryFilter ? 'No services match the active filters.' : 'Services and products published by clients will appear in this administrative catalog.'}
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-4">Service Offering</th>
                <th className="p-4">Provider Business</th>
                <th className="p-4">Category</th>
                <th className="p-4">Base Price</th>
                <th className="p-4">Visibility</th>
                <th className="p-4 text-right">Moderation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredServices.map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-800/40">
                  <td className="p-4">
                    <div className="font-bold text-white">{s.title}</div>
                    <div className="text-[11px] text-slate-400 line-clamp-1 max-w-xs">{s.description || 'No description'}</div>
                  </td>
                  <td className="p-4">
                    <div className="font-medium text-indigo-300">{s.client_business_name}</div>
                    {s.client_approval_status !== 'APPROVED' && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-bold">
                        <AlertTriangle className="w-3 h-3" /> Provider Unapproved
                      </span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                      {s.category_name}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-white">${parseFloat(s.price || '0').toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                      s.is_available ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {s.is_available ? <CheckCircle2 className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {s.is_available ? 'Active' : 'Hidden'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => toggleAvailabilityMutation.mutate(s.id)}
                      disabled={toggleAvailabilityMutation.isPending}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 rounded-lg border border-slate-700"
                    >
                      {s.is_available ? 'Hide Service' : 'Show Service'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
