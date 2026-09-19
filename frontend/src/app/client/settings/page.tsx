'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Building, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

export default function ClientSettingsPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Business Account Settings"
        description="Configure operating preferences, account credentials, and platform integration parameters."
      />

      <div className="space-y-4">
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
            <Building className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Business Account Credentials</h2>
              <p className="text-xs text-zinc-400">Account details and role access parameters.</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <Input
              label="Contact Email"
              disabled
              value={user?.email || ''}
            />
            <Input
              label="Business Verification State"
              disabled
              value={user?.client_profile?.approval_status || 'PENDING_APPROVAL'}
            />
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Platform Commission Structure</h2>
              <p className="text-xs text-zinc-400">Locked platform fee parameters for verified providers.</p>
            </div>
          </div>
          <div className="text-xs text-zinc-300 space-y-2 leading-relaxed">
            <p>• Standard Commission Deduction: 10% automatically deducted upon order settlement.</p>
            <p>• Provider Net Share: 90% deposited directly to your available balance.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
