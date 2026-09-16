'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Users, Mail, Phone, Calendar } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

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
      <div>
        <h1 className="text-2xl font-bold text-white">Customer Directory</h1>
        <p className="text-xs text-slate-400 mt-1">Verified consumers who have placed booking orders with your business.</p>
      </div>

      {isLoading ? (
        <TableSkeleton rows={3} />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No customer transactions yet"
          description="Customer contact information will automatically appear here as consumers book your offerings."
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-4">Customer Name</th>
                <th className="p-4">Email Address</th>
                <th className="p-4">Contact Phone</th>
                <th className="p-4">Total Orders</th>
                <th className="p-4">Total Value</th>
                <th className="p-4 text-right">Last Engaged</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {customers.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-800/40">
                  <td className="p-4 font-bold text-white">{c.name}</td>
                  <td className="p-4 text-indigo-400 font-medium">{c.email}</td>
                  <td className="p-4 text-slate-300">{c.phone || 'N/A'}</td>
                  <td className="p-4 font-semibold">{c.total_orders} {c.total_orders === 1 ? 'booking' : 'bookings'}</td>
                  <td className="p-4 font-bold text-emerald-400">${parseFloat(c.total_spent).toFixed(2)}</td>
                  <td className="p-4 text-right text-slate-400">{new Date(c.last_order_date).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

