'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ShoppingBag, Eye, Star } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import OrderDetailModal from '@/components/consumer/OrderDetailModal';

function ConsumerOrdersContent() {
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['consumerOrdersPage', statusFilter],
    queryFn: async () => {
      const params = statusFilter ? { status_filter: statusFilter } : {};
      const res = await api.get('/consumer/orders', { params });
      return res.data;
    },
  });

  const orderIdParam = searchParams.get('orderId');

  useEffect(() => {
    if (orderIdParam && orders.length > 0) {
      const found = orders.find((o: any) => o.id === orderIdParam || o.order_number === orderIdParam);
      if (found) {
        setSelectedOrder(found);
        setIsDetailOpen(true);
      }
    }
  }, [orderIdParam, orders]);

  const handleOpenDetail = (ord: any) => {
    setSelectedOrder(ord);
    setIsDetailOpen(true);
  };

  const statuses = ['ALL', 'PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Orders & Booking Requests</h1>
        <p className="text-xs text-slate-400 mt-1">Track the fulfillment progress, status updates, and transaction receipts of your bookings.</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s === 'ALL' ? '' : s)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              (s === 'ALL' && !statusFilter) || statusFilter === s
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No requests found"
          description={statusFilter ? `You do not have any orders with status '${statusFilter}'.` : "You have not placed any booking requests yet."}
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Order #</th>
                  <th className="p-4">Offering Title</th>
                  <th className="p-4">Provider</th>
                  <th className="p-4">Total</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {orders.map((ord: any) => (
                  <tr
                    key={ord.id}
                    onClick={() => handleOpenDetail(ord)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="p-4 font-mono font-bold text-white">{ord.order_number}</td>
                    <td className="p-4 font-medium text-slate-200">{ord.items?.[0]?.item_title || 'Service Offering'}</td>
                    <td className="p-4 text-indigo-400">{ord.client_business_name}</td>
                    <td className="p-4 font-bold text-emerald-400">${parseFloat(ord.total_amount).toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        ord.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        ord.status === 'ACCEPTED' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        ord.status === 'IN_PROGRESS' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        ord.status === 'REJECTED' || ord.status === 'CANCELLED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                        'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      }`}>
                        {ord.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-400">{new Date(ord.created_at).toLocaleDateString()}</td>
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleOpenDetail(ord)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 ml-auto transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && isDetailOpen && (
        <OrderDetailModal
          order={selectedOrder}
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedOrder(null);
          }}
          onOrderUpdated={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
}

export default function ConsumerOrdersPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={5} />}>
      <ConsumerOrdersContent />
    </Suspense>
  );
}

