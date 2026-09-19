'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { Layers, Search, AlertTriangle } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';

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

  const filteredServices = services.filter((s: any) => {
    const matchesSearch = !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.client_business_name?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || s.category_name === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Global Services Catalog Moderation"
        description="Browse and moderate all offerings published by business owners across the marketplace platform."
        actions={
          <div className="flex items-center gap-2">
            <div className="w-40">
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div className="w-48">
              <Input
                placeholder="Search catalog..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="w-4 h-4 text-zinc-400" />}
              />
            </div>
          </div>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : filteredServices.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No Services Found"
          description={search || categoryFilter ? 'No services match the active filters.' : 'Services and products published by clients will appear in this administrative catalog.'}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service Offering</TableHead>
              <TableHead>Provider Business</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Base Price</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead className="text-right">Moderation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredServices.map((s: any) => (
              <TableRow key={s.id}>
                <TableCell>
                  <div className="font-semibold text-zinc-100">{s.title}</div>
                  <div className="text-[11px] text-zinc-400 line-clamp-1 max-w-xs">{s.description || 'No description'}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-indigo-400">{s.client_business_name}</div>
                  {s.client_approval_status !== 'APPROVED' && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 font-bold">
                      <AlertTriangle className="w-3 h-3" /> Provider Unapproved
                    </span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="neutral" size="sm">
                    {s.category_name}
                  </Badge>
                </TableCell>
                <TableCell className="font-bold text-zinc-100">${parseFloat(s.price || '0').toFixed(2)}</TableCell>
                <TableCell>
                  <Badge status={s.is_available ? 'ACTIVE' : 'INACTIVE'} size="sm" />
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    onClick={() => toggleAvailabilityMutation.mutate(s.id)}
                    disabled={toggleAvailabilityMutation.isPending}
                    variant="outline"
                    size="sm"
                  >
                    {s.is_available ? 'Hide Service' : 'Show Service'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
