'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { CreditCard, CheckCircle2 } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/LoadingSkeleton';

export default function ClientPaymentsPage() {
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['clientPayments'],
    queryFn: async () => {
      const res = await api.get('/client/payments');
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Payment Transactions & Financial Breakdown</h1>
        <p className="text-xs text-slate-400 mt-1">Escrow payment authorizations and automated 90% owner settlement records for your bookings.</p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
          <span className="text-xs text-slate-400 font-medium block">Total Authorized Volume</span>
          <p className="text-2xl font-extrabold text-white mt-1">
            ${payments.reduce((acc: number, p: any) => acc + (parseFloat(p.amount) || 0), 0).toFixed(2)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Gross customer transactions</span>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
          <span className="text-xs text-slate-400 font-medium block">Platform Retained Fee (10%)</span>
          <p className="text-2xl font-extrabold text-amber-400 mt-1">
            ${(payments.reduce((acc: number, p: any) => acc + (parseFloat(p.amount) || 0), 0) * 0.10).toFixed(2)}
          </p>
          <span className="text-[11px] text-slate-500 mt-1 block">Marketplace hosting commission</span>
        </div>

        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
          <span className="text-xs text-slate-400 font-medium block">Owner Net Earnings (90%)</span>
          <p className="text-2xl font-extrabold text-emerald-400 mt-1">
            ${(payments.reduce((acc: number, p: any) => acc + (parseFloat(p.amount) || 0), 0) * 0.90).toFixed(2)}
          </p>
          <span className="text-[11px] text-emerald-400 mt-1 block">Credited to withdrawable balance</span>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : payments.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No payment records"
          description="Customer payment transactions will be recorded here upon order authorization."
        />
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase font-bold text-[10px]">
              <tr>
                <th className="p-4">Transaction ID</th>
                <th className="p-4">Payment Method</th>
                <th className="p-4">Gross Amount</th>
                <th className="p-4">Platform Fee (10%)</th>
                <th className="p-4">Owner Net (90%)</th>
                <th className="p-4">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {payments.map((p: any) => {
                const gross = parseFloat(p.amount) || 0;
                const platformFee = gross * 0.10;
                const ownerNet = gross * 0.90;

                return (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="p-4 font-mono font-bold text-indigo-400">{p.transaction_id || p.id.slice(0, 12)}</td>
                    <td className="p-4 capitalize text-slate-300">{p.payment_method || 'Card'}</td>
                    <td className="p-4 font-bold text-white">${gross.toFixed(2)}</td>
                    <td className="p-4 font-semibold text-amber-400">${platformFee.toFixed(2)}</td>
                    <td className="p-4 font-bold text-emerald-400">${ownerNet.toFixed(2)}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
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

