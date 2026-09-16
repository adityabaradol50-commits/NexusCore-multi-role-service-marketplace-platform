'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { ShoppingBag, Filter, ArrowUpRight, CheckCircle2, Clock, XCircle, AlertTriangle, Eye } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

export default function AdminOrdersPage() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['adminOrdersList', statusFilter],
    queryFn: async () => {
      const params: any = {};
      if (statusFilter) params.status_filter = statusFilter;
      const res = await api.get('/admin/orders', { params });
      return res.data;
    },
  });

  const cancelOrderMutation = useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      const res = await api.patch(`/admin/orders/${orderId}/cancel`, null, { params: { reason } });
      return res.data;
    },
    onSuccess: () => {
      addToast('Order administratively cancelled successfully.', 'success');
      queryClient.invalidateQueries({ queryKey: ['adminOrdersList'] });
      setShowCancelDialog(false);
      setSelectedOrder(null);
      setCancelReason('');
    },
    onError: (err: any) => {
      addToast(err.response?.data?.detail || 'Failed to cancel order', 'error');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-indigo-400" />
            Global Orders & Requests Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Master overview of all transactions, consumer service bookings, and operational statuses.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No Orders Found"
          description={statusFilter ? `No orders found with status "${statusFilter}".` : 'No orders have been recorded in the platform ledger yet.'}
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-4">Order #</th>
                <th className="p-4">Consumer</th>
                <th className="p-4">Provider Business</th>
                <th className="p-4">Gross Amount</th>
                <th className="p-4">Fee (10%)</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {orders.map((o: any) => (
                <tr key={o.id} className="hover:bg-slate-800/40">
                  <td className="p-4 font-mono font-bold text-white">{o.order_number}</td>
                  <td className="p-4">
                    <div className="text-white font-medium">{o.consumer_name || 'Consumer'}</div>
                    <div className="text-[11px] text-slate-400">{o.consumer_email}</div>
                  </td>
                  <td className="p-4 font-medium text-indigo-300">{o.client_business_name || 'Provider'}</td>
                  <td className="p-4 font-bold text-white">${Number(o.total_amount).toFixed(2)}</td>
                  <td className="p-4 font-semibold text-emerald-400">${Number(o.platform_fee).toFixed(2)}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      o.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      o.status === 'ACCEPTED' || o.status === 'IN_PROGRESS' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                      o.status === 'PENDING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                      'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {o.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setSelectedOrder(o)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold"
                    >
                      Inspect Order
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Admin Order Inspector Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase font-mono text-indigo-400 font-bold">Master Order Oversight</span>
                <h3 className="text-lg font-bold text-white">Order #{selectedOrder.order_number}</h3>
                <p className="text-xs text-slate-400">Created {new Date(selectedOrder.created_at).toLocaleString()}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-white font-bold text-lg">✕</button>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="grid grid-cols-2 gap-3 bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[11px]">Consumer</span>
                  <strong className="text-white block">{selectedOrder.consumer_name || 'Consumer'}</strong>
                  <span className="text-slate-400 text-[10px]">{selectedOrder.consumer_email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Provider Business</span>
                  <strong className="text-indigo-300 block">{selectedOrder.client_business_name || 'Provider'}</strong>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <span className="text-slate-400 font-bold text-[11px] uppercase">Line Items</span>
                {selectedOrder.items?.map((item: any) => (
                  <div key={item.id} className="flex justify-between p-2.5 bg-slate-800/60 rounded-xl">
                    <span>{item.item_title} (x{item.quantity})</span>
                    <strong className="text-white">${(Number(item.unit_price) * item.quantity).toFixed(2)}</strong>
                  </div>
                ))}
              </div>

              {/* Financial Split */}
              <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-800 space-y-1">
                <div className="flex justify-between"><span>Gross Total:</span><strong className="text-white">${Number(selectedOrder.total_amount).toFixed(2)}</strong></div>
                <div className="flex justify-between text-emerald-400"><span>Platform Fee (10%):</span><strong>${Number(selectedOrder.platform_fee).toFixed(2)}</strong></div>
                <div className="flex justify-between text-slate-200"><span>Client Net Earnings (90%):</span><strong>${Number(selectedOrder.client_earnings).toFixed(2)}</strong></div>
              </div>

              {selectedOrder.rejection_reason && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300">
                  <strong>Cancellation/Rejection Reason:</strong> {selectedOrder.rejection_reason}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center pt-2">
              {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'COMPLETED' ? (
                <button
                  onClick={() => setShowCancelDialog(true)}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold rounded-xl"
                >
                  Admin Cancel Order
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>

            {/* Cancel confirmation inner box */}
            {showCancelDialog && (
              <div className="mt-4 p-4 bg-slate-800 border border-slate-700 rounded-xl space-y-3">
                <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" /> Confirm Administrative Cancellation
                </h4>
                <input
                  type="text"
                  placeholder="Reason for administrative intervention..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setShowCancelDialog(false)} className="px-3 py-1 text-xs text-slate-400">Cancel</button>
                  <button
                    onClick={() => cancelOrderMutation.mutate({ orderId: selectedOrder.id, reason: cancelReason })}
                    disabled={cancelOrderMutation.isPending}
                    className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg"
                  >
                    Confirm Order Cancellation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
