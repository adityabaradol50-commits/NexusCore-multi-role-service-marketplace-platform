'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Settings, Building, ShieldCheck, Clock } from 'lucide-react';

export default function ClientSettingsPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Business Settings</h1>
        <p className="text-xs text-slate-400 mt-1">Configure operating preferences, account credentials, and platform integration parameters.</p>
      </div>

      <div className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <Building className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Business Account Credentials</h2>
              <p className="text-xs text-slate-400">Account details and role access parameters.</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs text-slate-400">Contact Email</label>
              <input
                type="text"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-xs text-slate-300 cursor-not-allowed mt-1"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400">Business Verification State</label>
              <input
                type="text"
                disabled
                value={user?.client_profile?.approval_status || 'PENDING_APPROVAL'}
                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-xs text-amber-400 font-bold cursor-not-allowed mt-1"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Platform Commission Structure</h2>
              <p className="text-xs text-slate-400">Locked platform fee parameters for verified providers.</p>
            </div>
          </div>
          <div className="text-xs text-slate-300 space-y-2">
            <p>• Standard Commission Deduction: 10% automatically deducted upon order settlement.</p>
            <p>• Payout Schedule: Instant balance availability upon completion.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
