'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Key, Shield } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

export default function ConsumerSettingsPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Account Settings & Security"
        description="Manage security credentials, session tokens, and account preferences."
      />

      <div className="space-y-4">
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
            <Key className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Security & Credentials</h2>
              <p className="text-xs text-zinc-400">Account passwords are cryptographically secured using salted Bcrypt hashes.</p>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <Input
              label="Registered Email Address"
              disabled
              value={user?.email || ''}
            />
            <Input
              label="Account Role Clearance"
              disabled
              value="CLIENT (Verified Marketplace Account)"
            />
          </div>
        </Card>

        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
            <Shield className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">Session Security</h2>
              <p className="text-xs text-zinc-400">Stateless JSON Web Tokens with RFC 7519 unique identifier claims and automatic token rotation.</p>
            </div>
          </div>
          <div className="text-xs text-zinc-400 space-y-1.5 leading-relaxed">
            <p>• Access Token Duration: 60 minutes</p>
            <p>• Refresh Token Duration: 7 days</p>
            <p>• Automatic Silent Refresh: Active via Axios response interceptors</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
