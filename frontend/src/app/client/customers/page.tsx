'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Users } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';

export default function ClientCustomersPage() {
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['clientCustomers'],
    queryFn: async () => {
      const res = await api.get('/client/customers');
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Directory"
        description="Verified consumers who have placed booking orders with your business."
      />

      {isLoading ? (
        <TableSkeleton rows={3} />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customer transactions yet"
          description="Customer contact information will automatically appear here as consumers book your offerings."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer Name</TableHead>
              <TableHead>Email Address</TableHead>
              <TableHead>Contact Phone</TableHead>
              <TableHead>Total Orders</TableHead>
              <TableHead>Total Value</TableHead>
              <TableHead className="text-right">Last Engaged</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-bold text-zinc-100">{c.name}</TableCell>
                <TableCell className="text-indigo-400 font-medium">{c.email}</TableCell>
                <TableCell className="text-zinc-300">{c.phone || 'N/A'}</TableCell>
                <TableCell className="font-medium">{c.total_orders} {c.total_orders === 1 ? 'booking' : 'bookings'}</TableCell>
                <TableCell className="font-bold text-emerald-400">${parseFloat(c.total_spent).toFixed(2)}</TableCell>
                <TableCell className="text-right text-zinc-400">{new Date(c.last_order_date).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
