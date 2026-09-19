'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { Inbox, Eye } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import ClientOrderDetailModal from '@/components/client/ClientOrderDetailModal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';

function ClientRequestsContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['clientOrdersRequests', statusFilter],
    queryFn: async () => {
      const params = statusFilter !== 'ALL' ? { status_filter: statusFilter } : {};
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

  const tabs = [
    { id: 'ALL', label: 'All Requests' },
    { id: 'PENDING', label: 'Pending' },
    { id: 'ACCEPTED', label: 'Accepted' },
    { id: 'IN_PROGRESS', label: 'In Progress' },
    { id: 'COMPLETED', label: 'Completed' },
    { id: 'REJECTED', label: 'Rejected' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consumer Requests & Bookings"
        description="Review incoming requests, update order status, and complete fulfillments to release 90% net earnings."
      />

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={statusFilter}
        onChange={(tabId) => setStatusFilter(tabId)}
      />

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No customer requests"
          description={statusFilter !== 'ALL' ? `No bookings with status '${statusFilter}'.` : "You haven't received any customer requests yet."}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Offering</TableHead>
              <TableHead>90% Net Payout</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((ord: any) => (
              <TableRow
                key={ord.id}
                onClick={() => handleOpenDetail(ord)}
                className="cursor-pointer"
              >
                <TableCell className="font-mono font-bold text-zinc-100">{ord.order_number}</TableCell>
                <TableCell>
                  <p className="font-medium text-zinc-100">{ord.consumer_name}</p>
                  <p className="text-[11px] text-zinc-400">{ord.consumer_email}</p>
                </TableCell>
                <TableCell className="text-zinc-200">{ord.items?.[0]?.item_title || 'Custom Offering'}</TableCell>
                <TableCell className="font-bold text-emerald-400">${parseFloat(ord.client_earnings).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge status={ord.status} size="sm" />
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      onClick={() => handleOpenDetail(ord)}
                      variant="outline"
                      size="sm"
                      leftIcon={<Eye className="w-3.5 h-3.5" />}
                    >
                      Inspect
                    </Button>

                    {ord.status === 'PENDING' && (
                      <>
                        <Button
                          onClick={() => updateStatusMutation.mutate({ orderId: ord.id, status: 'ACCEPTED' })}
                          variant="primary"
                          size="sm"
                        >
                          Accept
                        </Button>
                        <Button
                          onClick={() => updateStatusMutation.mutate({ orderId: ord.id, status: 'REJECTED' })}
                          variant="danger"
                          size="sm"
                        >
                          Decline
                        </Button>
                      </>
                    )}

                    {ord.status === 'ACCEPTED' && (
                      <Button
                        onClick={() => updateStatusMutation.mutate({ orderId: ord.id, status: 'IN_PROGRESS' })}
                        variant="secondary"
                        size="sm"
                      >
                        Start Session
                      </Button>
                    )}

                    {ord.status === 'IN_PROGRESS' && (
                      <Button
                        onClick={() => updateStatusMutation.mutate({ orderId: ord.id, status: 'COMPLETED' })}
                        variant="success"
                        size="sm"
                      >
                        Complete Order
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
