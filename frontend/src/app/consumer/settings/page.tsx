'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Settings, Key, Shield, Smartphone } from 'lucide-react';

export default function ConsumerSettingsPage() {
  const { user } = useAuth();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Account Settings</h1>
        <p className="text-xs text-slate-400 mt-1">Manage security credentials, session tokens, and account preferences.</p>
      </div>

      <div className="space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <Key className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Security & Password</h2>
              <p className="text-xs text-slate-400">Account passwords are cryptographically secured using salted Bcrypt hashes.</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="block text-xs text-slate-400">Registered Email Address</label>
              <input
                type="text"
                disabled
                value={user?.email || ''}
                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-xs text-slate-300 cursor-not-allowed mt-1"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400">Account Role Clearance</label>
              <input
                type="text"
                disabled
                value="CLIENT (Verified Account)"
                className="w-full px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-xs text-indigo-300 font-semibold cursor-not-allowed mt-1"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
            <Shield className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Session Security</h2>
              <p className="text-xs text-slate-400">Stateless JSON Web Tokens with RFC 7519 unique identifier claims and automatic token rotation.</p>
            </div>
          </div>
          <div className="text-xs text-slate-400 space-y-1">
            <p>• Access Token Life: 60 minutes</p>
            <p>• Refresh Token Life: 7 days</p>
            <p>• Automatic Silent Refresh: Enabled via Axios response interceptors</p>
          </div>
        </div>
      </div>
    </div>
  );
}
