'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CreditCard, DollarSign, CheckCircle2, Clock, AlertCircle, ShieldCheck } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

export default function AdminPaymentsPage() {
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['adminPaymentsList'],
    queryFn: async () => {
      const res = await api.get('/admin/orders');
      return res.data;
    },
  });

  // Extract payment records from orders
  const payments = orders.filter((o: any) => o.payment !== null);

  const totalProcessed = payments
    .filter((o: any) => o.payment?.status === 'PAID')
    .reduce((acc: number, o: any) => acc + Number(o.payment?.amount || 0), 0);

  const platformCut = payments
    .filter((o: any) => o.payment?.status === 'PAID')
    .reduce((acc: number, o: any) => acc + Number(o.platform_fee || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-emerald-400" />
          Global Payments & Settlement Ledger
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Monitor payment processing, gateway transactions, escrow holding, and automated platform commission fees.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="text-xs text-slate-400 font-medium">Total Volume Processed</div>
          <div className="text-2xl font-black text-white mt-1">${totalProcessed.toFixed(2)}</div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Settled across all merchants
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="text-xs text-slate-400 font-medium">Platform Net Take (10%)</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">${platformCut.toFixed(2)}</div>
          <div className="text-[11px] text-slate-400 mt-1">Accrued platform commission</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
          <div className="text-xs text-slate-400 font-medium">Recorded Transactions</div>
          <div className="text-2xl font-black text-white mt-1">{payments.length}</div>
          <div className="text-[11px] text-indigo-400 mt-1">Gateway settlement events</div>
        </div>
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
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-4">Transaction Reference</th>
                <th className="p-4">Order #</th>
                <th className="p-4">Provider Recipient</th>
                <th className="p-4">Gross Amount</th>
                <th className="p-4">Commission</th>
                <th className="p-4">Net Payout</th>
                <th className="p-4">Gateway Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {payments.map((o: any) => {
                const p = o.payment;
                return (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="p-4 font-mono font-bold text-white">{p.transaction_id || p.id.slice(0, 12)}</td>
                    <td className="p-4 font-mono text-slate-300">{o.order_number}</td>
                    <td className="p-4 font-medium text-indigo-300">{o.client_business_name}</td>
                    <td className="p-4 font-bold text-white">${Number(p.amount).toFixed(2)}</td>
                    <td className="p-4 font-semibold text-emerald-400">${Number(o.platform_fee).toFixed(2)}</td>
                    <td className="p-4 font-semibold text-slate-200">${Number(o.client_earnings).toFixed(2)}</td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        p.status === 'PAID' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        p.status === 'PENDING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
