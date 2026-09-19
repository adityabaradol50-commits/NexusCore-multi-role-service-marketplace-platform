'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { Building, Save, User, Phone } from 'lucide-react';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

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
      <PageHeader
        title="Business Profile & Settings"
        description="Manage public provider details, company registration identifiers, contact representative, and service coverage."
        badgeText={approvalStatus}
        badgeVariant={approvalStatus === 'APPROVED' ? 'success' : approvalStatus === 'REJECTED' ? 'danger' : 'warning'}
      />

      <Card className="p-6 sm:p-7 space-y-6">
        {/* Business Header Preview */}
        <div className="flex items-center gap-4 pb-6 border-b border-zinc-800">
          {profile?.logo_url ? (
            <img
              src={profile.logo_url}
              alt={profile.business_name || 'Business Logo'}
              className="w-14 h-14 rounded-xl object-contain bg-zinc-800 p-1.5 border border-zinc-700/60 shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700/60 flex items-center justify-center font-bold text-xl shrink-0">
              <Building className="w-7 h-7" />
            </div>
          )}
          <div>
            <h2 className="text-base font-bold text-zinc-100">{profile?.business_name || 'My Business'}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Owner: {profile?.first_name || user?.first_name} {profile?.last_name || user?.last_name}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant="success" size="sm">OWNER</Badge>
              {profile?.service_area && (
                <Badge variant="neutral" size="sm">{profile.service_area}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Business Edit Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateProfileMutation.mutate();
          }}
          className="space-y-5"
        >
          {/* Contact Person */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>Contact Representative</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="First Name *"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <Input
                label="Last Name *"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>

            <Input
              label="Contact Phone"
              type="tel"
              placeholder="+1-555-8888"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leftIcon={<Phone className="w-3.5 h-3.5 text-zinc-400" />}
            />
          </div>

          {/* Business Details */}
          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <h3 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-emerald-400" />
              <span>Company Information</span>
            </h3>

            <Input
              label="Business Name *"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Registration / Tax Identifier"
                placeholder="e.g. REG-984728"
                value={businessRegNo}
                onChange={(e) => setBusinessRegNo(e.target.value)}
              />
              <Input
                label="Service Coverage Area"
                placeholder="e.g. Global / Remote or California"
                value={serviceArea}
                onChange={(e) => setServiceArea(e.target.value)}
              />
            </div>

            <Textarea
              label="Company Overview & Bio"
              rows={4}
              placeholder="Describe your capabilities, history, and domain expertise..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={updateProfileMutation.isPending}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Update Business Profile
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
