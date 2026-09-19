'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { ShoppingBag, Eye } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import OrderDetailModal from '@/components/consumer/OrderDetailModal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs } from '@/components/ui/Tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';

function ConsumerOrdersContent() {
  const searchParams = useSearchParams();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['consumerOrdersPage', statusFilter],
    queryFn: async () => {
      const params = statusFilter !== 'ALL' ? { status_filter: statusFilter } : {};
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

  const tabs = [
    { id: 'ALL', label: 'All Orders' },
    { id: 'PENDING', label: 'Pending' },
    { id: 'ACCEPTED', label: 'Accepted' },
    { id: 'IN_PROGRESS', label: 'In Progress' },
    { id: 'COMPLETED', label: 'Completed' },
    { id: 'CANCELLED', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders & Booking Requests"
        description="Track fulfillment progress, status updates, and transaction receipts for your bookings."
      />

      {/* Filter Tabs */}
      <Tabs
        tabs={tabs}
        activeTab={statusFilter}
        onChange={(tabId) => setStatusFilter(tabId)}
      />

      {/* Content */}
      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No requests found"
          description={statusFilter !== 'ALL' ? `You do not have any orders with status '${statusFilter}'.` : "You have not placed any booking requests yet."}
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Offering Title</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
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
                <TableCell className="font-medium text-zinc-200">{ord.items?.[0]?.item_title || 'Service Offering'}</TableCell>
                <TableCell className="text-indigo-400 font-medium">{ord.client_business_name}</TableCell>
                <TableCell className="font-bold text-emerald-400">${parseFloat(ord.total_amount).toFixed(2)}</TableCell>
                <TableCell>
                  <Badge status={ord.status} size="sm" />
                </TableCell>
                <TableCell className="text-zinc-400">{new Date(ord.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <Button
                    onClick={() => handleOpenDetail(ord)}
                    variant="outline"
                    size="sm"
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                  >
                    View
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
