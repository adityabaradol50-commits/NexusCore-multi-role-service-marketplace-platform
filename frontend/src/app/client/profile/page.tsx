'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { Building, Save, ShieldCheck, Clock, XCircle, User, Phone, Mail } from 'lucide-react';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';

export default function ClientProfilePage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [businessName, setBusinessName] = useState('');
  const [businessRegNo, setBusinessRegNo] = useState('');
  const [bio, setBio] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['clientProfileData'],
    queryFn: async () => {
      const res = await api.get('/client/profile');
      return res.data;
    },
  });

  useEffect(() => {
    if (profile) {
      setBusinessName(profile.business_name || '');
      setBusinessRegNo(profile.business_registration_no || '');
      setBio(profile.bio || '');
      setServiceArea(profile.service_area || '');
      setFirstName(profile.first_name || user?.first_name || '');
      setLastName(profile.last_name || user?.last_name || '');
      setPhone(profile.phone || user?.phone || '');
    }
  }, [profile, user]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put('/client/profile', {
        business_name: businessName,
        business_registration_no: businessRegNo,
        bio,
        service_area: serviceArea,
        first_name: firstName,
        last_name: lastName,
        phone,
      });
      return res.data;
    },
    onSuccess: () => {
      refreshUser();
      showToast('Business profile updated successfully', 'success');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.detail || 'Failed to update business profile', 'error');
    },
  });

  if (isLoading) {
    return <CardSkeleton />;
  }

  const approvalStatus = profile?.approval_status || 'PENDING_APPROVAL';

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Business Profile</h1>
        <p className="text-xs text-slate-400 mt-1">Manage public provider details, company registration numbers, contact person details, and service coverage.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
        {/* Business Header Preview */}
        <div className="flex items-center gap-4 pb-6 border-b border-slate-800">
          {profile?.logo_url ? (
            <img
              src={profile.logo_url}
              alt={profile.business_name || 'Business Logo'}
              className="w-16 h-16 rounded-2xl object-contain bg-white/10 p-2 border border-emerald-500/30 shadow-lg"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xl shadow-lg">
              <Building className="w-8 h-8" />
            </div>
          )}
          <div>
            <h2 className="text-xl font-bold text-white">{profile?.business_name || 'My Business'}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Owner: {profile?.first_name || user?.first_name} {profile?.last_name || user?.last_name}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                OWNER
              </span>
              {profile?.service_area && (
                <span className="text-[10px] text-slate-300 font-medium bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {profile.service_area}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Verification Status Card */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-800/60 border border-slate-700/60">
          <div>
            <span className="text-xs text-slate-400 block font-medium">Administrative Vetting Status</span>
            <span className={`text-sm font-bold mt-1 inline-flex items-center gap-1.5 ${
              approvalStatus === 'APPROVED' ? 'text-emerald-400' :
              approvalStatus === 'PENDING_APPROVAL' ? 'text-amber-400' :
              'text-rose-400'
            }`}>
              {approvalStatus === 'APPROVED' && <ShieldCheck className="w-4 h-4" />}
              {approvalStatus === 'PENDING_APPROVAL' && <Clock className="w-4 h-4" />}
              {approvalStatus === 'REJECTED' && <XCircle className="w-4 h-4" />}
              <span>{approvalStatus}</span>
            </span>
          </div>

          <span className="text-[11px] text-slate-400 max-w-xs text-left sm:text-right">
            {approvalStatus === 'APPROVED' ? 'All business catalog operations unlocked.' : 'Vetting required before offerings become publicly searchable.'}
          </span>
        </div>

        {/* Business Edit Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateProfileMutation.mutate();
          }}
          className="space-y-6"
        >
          {/* Contact Person */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span>Contact Representative</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">First Name *</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Last Name *</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Contact Phone</label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  placeholder="+1-555-8888"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Business Details */}
          <div className="space-y-4 pt-4 border-t border-slate-800">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-emerald-400" />
              <span>Company Information</span>
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Business Name *</label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Registration / Tax Identifier</label>
                <input
                  type="text"
                  placeholder="e.g. REG-984728"
                  value={businessRegNo}
                  onChange={(e) => setBusinessRegNo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Service Coverage Area</label>
                <input
                  type="text"
                  placeholder="e.g. Global / Remote or California"
                  value={serviceArea}
                  onChange={(e) => setServiceArea(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Company Overview & Bio</label>
              <textarea
                rows={4}
                placeholder="Describe your capabilities, history, and domain expertise..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 leading-relaxed"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{updateProfileMutation.isPending ? 'Saving...' : 'Update Business Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

