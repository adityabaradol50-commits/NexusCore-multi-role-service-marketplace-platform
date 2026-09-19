'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CreditCard, CheckCircle2, ShieldCheck } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';

export default function AdminPaymentsPage() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['adminPaymentsList'],
    queryFn: async () => {
      const res = await api.get('/admin/orders');
      return res.data;
    },
  });

  const payments = orders.filter((o: any) => o.payment !== null);

  const totalProcessed = payments
    .filter((o: any) => o.payment?.status === 'PAID')
    .reduce((acc: number, o: any) => acc + Number(o.payment?.amount || 0), 0);

  const platformCut = payments
    .filter((o: any) => o.payment?.status === 'PAID')
    .reduce((acc: number, o: any) => acc + Number(o.platform_fee || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Global Payments & Financial Settlement Ledger"
        description="Monitor payment processing, gateway transactions, escrow holding, and automated 10% platform commission fees."
        badgeText="Master Settlement"
        badgeVariant="success"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatCard
          title="Total Volume Processed"
          value={`$${totalProcessed.toFixed(2)}`}
          subtitle="Settled across all merchants"
          changeType="positive"
          icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          iconBg="bg-emerald-500/10 border-emerald-500/20"
        />

        <StatCard
          title="Platform Net Take (10%)"
          value={`$${platformCut.toFixed(2)}`}
          subtitle="Accrued platform fee revenue"
          changeType="positive"
          icon={<ShieldCheck className="w-4 h-4 text-indigo-400" />}
          iconBg="bg-indigo-500/10 border-indigo-500/20"
        />

        <StatCard
          title="Recorded Transactions"
          value={payments.length}
          subtitle="Gateway settlement events"
          changeType="neutral"
          icon={<CreditCard className="w-4 h-4 text-zinc-300" />}
          iconBg="bg-zinc-800 border-zinc-700"
        />
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No Settled Transactions"
          description="Payments processed through consumer order checkouts will appear in this ledger."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Transaction Reference</TableHead>
              <TableHead>Order #</TableHead>
              <TableHead>Provider Recipient</TableHead>
              <TableHead>Gross Amount</TableHead>
              <TableHead>Commission (10%)</TableHead>
              <TableHead>Net Payout (90%)</TableHead>
              <TableHead>Gateway Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((o: any) => {
              const p = o.payment;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-mono font-bold text-zinc-100">{p.transaction_id || p.id.slice(0, 12)}</TableCell>
                  <TableCell className="font-mono text-zinc-300">{o.order_number}</TableCell>
                  <TableCell className="font-medium text-indigo-400">{o.client_business_name}</TableCell>
                  <TableCell className="font-bold text-zinc-100">${Number(p.amount).toFixed(2)}</TableCell>
                  <TableCell className="font-bold text-emerald-400">${Number(o.platform_fee).toFixed(2)}</TableCell>
                  <TableCell className="font-semibold text-zinc-200">${Number(o.client_earnings).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge status={p.status} size="sm" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
