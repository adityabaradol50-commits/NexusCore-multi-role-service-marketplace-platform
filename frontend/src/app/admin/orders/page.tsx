'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useToast } from '@/context/ToastContext';
import { ShoppingBag, Eye, AlertTriangle } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Modal } from '@/components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';

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
      <PageHeader
        title="Global Master Orders Ledger"
        description="Master overview of all transactions, consumer service bookings, and 10% platform fee calculations."
        actions={
          <div className="w-48">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
              <option value="REJECTED">Rejected</option>
            </Select>
          </div>
        }
      />

      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No Orders Found"
          description={statusFilter ? `No orders found with status "${statusFilter}".` : 'No orders have been recorded in the platform ledger yet.'}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Consumer</TableHead>
              <TableHead>Provider Business</TableHead>
              <TableHead>Gross Amount</TableHead>
              <TableHead>Platform Fee (10%)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((o: any) => (
              <TableRow key={o.id} onClick={() => setSelectedOrder(o)} className="cursor-pointer">
                <TableCell className="font-mono font-bold text-zinc-100">{o.order_number}</TableCell>
                <TableCell>
                  <div className="text-zinc-100 font-medium">{o.consumer_name || 'Consumer'}</div>
                  <div className="text-[11px] text-zinc-400">{o.consumer_email}</div>
                </TableCell>
                <TableCell className="font-medium text-indigo-400">{o.client_business_name || 'Provider'}</TableCell>
                <TableCell className="font-bold text-zinc-100">${Number(o.total_amount).toFixed(2)}</TableCell>
                <TableCell className="font-bold text-emerald-400">${Number(o.platform_fee).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge status={o.status} size="sm" />
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <Button
                    onClick={() => setSelectedOrder(o)}
                    variant="outline"
                    size="sm"
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                  >
                    Inspect
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Admin Order Inspector Modal */}
      {selectedOrder && (
        <Modal
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Order #${selectedOrder.order_number}`}
          description={`Created ${new Date(selectedOrder.created_at).toLocaleString()}`}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full">
              {selectedOrder.status !== 'CANCELLED' && selectedOrder.status !== 'COMPLETED' ? (
                <Button
                  onClick={() => setShowCancelDialog(true)}
                  variant="danger"
                  size="sm"
                >
                  Admin Cancel Order
                </Button>
              ) : (
                <div />
              )}
              <Button onClick={() => setSelectedOrder(null)} variant="secondary" size="sm">
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 text-xs">
              <div>
                <span className="text-zinc-400 block text-[11px] font-medium">Consumer</span>
                <strong className="text-zinc-100 block">{selectedOrder.consumer_name || 'Consumer'}</strong>
                <span className="text-zinc-400 text-[11px]">{selectedOrder.consumer_email}</span>
              </div>
              <div>
                <span className="text-zinc-400 block text-[11px] font-medium">Provider Business</span>
                <strong className="text-indigo-400 block">{selectedOrder.client_business_name || 'Provider'}</strong>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-1.5">
              <span className="text-zinc-400 font-medium text-[11px] uppercase tracking-wider">Line Items</span>
              {selectedOrder.items?.map((item: any) => (
                <div key={item.id} className="flex justify-between p-2.5 bg-zinc-950 rounded-xl text-xs border border-zinc-800">
                  <span className="text-zinc-200">{item.item_title} (x{item.quantity})</span>
                  <strong className="text-zinc-100">${(Number(item.unit_price) * item.quantity).toFixed(2)}</strong>
                </div>
              ))}
            </div>

            {/* Financial Split */}
            <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Gross Total Amount:</span>
                <strong className="text-zinc-100">${Number(selectedOrder.total_amount).toFixed(2)}</strong>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Platform Take (10%):</span>
                <strong>${Number(selectedOrder.platform_fee).toFixed(2)}</strong>
              </div>
              <div className="flex justify-between text-zinc-200 pt-1.5 border-t border-zinc-800">
                <span>Client Net Share (90%):</span>
                <strong className="text-emerald-400">${Number(selectedOrder.client_earnings).toFixed(2)}</strong>
              </div>
            </div>

            {selectedOrder.rejection_reason && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
                <strong>Reason for Status:</strong> {selectedOrder.rejection_reason}
              </div>
            )}

            {/* Cancel confirmation inner box */}
            {showCancelDialog && (
              <div className="p-3.5 bg-rose-950/40 border border-rose-500/30 rounded-xl space-y-3">
                <Input
                  label="Administrative Intervention Reason *"
                  placeholder="Reason for administrative cancellation..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                />
                <div className="flex justify-end gap-2">
                  <Button onClick={() => setShowCancelDialog(false)} variant="secondary" size="sm">
                    Cancel
                  </Button>
                  <Button
                    onClick={() => cancelOrderMutation.mutate({ orderId: selectedOrder.id, reason: cancelReason })}
                    isLoading={cancelOrderMutation.isPending}
                    variant="danger"
                    size="sm"
                  >
                    Confirm Cancellation
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
