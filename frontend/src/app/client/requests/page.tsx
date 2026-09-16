'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { Inbox, Check, X, CheckCircle2, Eye } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import ClientOrderDetailModal from '@/components/client/ClientOrderDetailModal';

function ClientRequestsContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['clientOrdersRequests', statusFilter],
    queryFn: async () => {
      const params = statusFilter ? { status_filter: statusFilter } : {};
      const res = await api.get('/client/orders', { params });
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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const res = await api.patch(`/client/orders/${orderId}/status`, { status });
      return res.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['clientOrdersRequests'] });
      showToast(`Order status updated to ${vars.status}`, 'success');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.detail || 'Status transition failed', 'error');
    },
  });

  const statuses = ['ALL', 'PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Consumer Requests & Bookings</h1>
        <p className="text-xs text-slate-400 mt-1">Review incoming booking requests, accept orders, and mark completions to release payouts.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s === 'ALL' ? '' : s)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              (s === 'ALL' && !statusFilter) || statusFilter === s
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No customer requests"
          description={statusFilter ? `No bookings with status '${statusFilter}'.` : "You haven't received any customer requests yet."}
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Order #</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Offering</th>
                  <th className="p-4">Net Payout</th>
                  <th className="p-4">Status</th>
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
                    <td className="p-4">
                      <p className="font-semibold text-white">{ord.consumer_name}</p>
                      <p className="text-[11px] text-slate-400">{ord.consumer_email}</p>
                    </td>
                    <td className="p-4 text-slate-200">{ord.items?.[0]?.item_title || 'Custom Offering'}</td>
                    <td className="p-4 font-bold text-emerald-400">${parseFloat(ord.client_earnings).toFixed(2)}</td>
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
                    <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenDetail(ord)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded text-xs font-semibold flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Details</span>
                        </button>

                        {ord.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => updateStatusMutation.mutate({ orderId: ord.id, status: 'ACCEPTED' })}
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-semibold"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => updateStatusMutation.mutate({ orderId: ord.id, status: 'REJECTED' })}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-rose-900 text-slate-300 rounded text-xs font-semibold"
                            >
                              Decline
                            </button>
                          </>
                        )}

                        {ord.status === 'ACCEPTED' && (
                          <button
                            onClick={() => updateStatusMutation.mutate({ orderId: ord.id, status: 'IN_PROGRESS' })}
                            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold"
                          >
                            Start
                          </button>
                        )}

                        {ord.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => updateStatusMutation.mutate({ orderId: ord.id, status: 'COMPLETED' })}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold"
                          >
                            Complete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Client Order Detail Modal */}
      {selectedOrder && isDetailOpen && (
        <ClientOrderDetailModal
          order={selectedOrder}
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedOrder(null);
          }}
          onOrderUpdated={() => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ['clientOrdersRequests'] });
          }}
        />
      )}
    </div>
  );
}

export default function ClientRequestsPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={4} />}>
      <ClientRequestsContent />
    </Suspense>
  );
}

