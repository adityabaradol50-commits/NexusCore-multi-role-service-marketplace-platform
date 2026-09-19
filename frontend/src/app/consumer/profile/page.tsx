'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { api } from '@/lib/api';
import { User, MapPin, Save, Phone } from 'lucide-react';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/ui/PageHeader';

export default function ConsumerProfilePage() {
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('US');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['consumerProfileData'],
    queryFn: async () => {
      const res = await api.get('/consumer/profile');
      return res.data;
    },
  });

  useEffect(() => {
    if (profile) {
      setFirstName(profile.first_name || user?.first_name || '');
      setLastName(profile.last_name || user?.last_name || '');
      setPhone(profile.phone || user?.phone || '');
      setAddressLine1(profile.address_line1 || '');
      setCity(profile.city || '');
      setPostalCode(profile.postal_code || '');
      setCountry(profile.country || 'US');
    }
  }, [profile, user]);

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const res = await api.put('/consumer/profile', {
        first_name: firstName,
        last_name: lastName,
        phone,
        address_line1: addressLine1,
        city,
        postal_code: postalCode,
        country,
      });
      return res.data;
    },
    onSuccess: () => {
      refreshUser();
      showToast('Profile details updated successfully', 'success');
    },
    onError: (err: any) => {
      showToast(err.response?.data?.detail || 'Failed to update profile', 'error');
    },
  });

  if (isLoading) {
    return <CardSkeleton />;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="Account Profile"
        description="Manage your personal contact details and service delivery address for booking requests."
      />

      <Card className="p-6 sm:p-7 space-y-6">
        {/* Account Summary Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-zinc-800">
          <div className="w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center font-bold text-sm text-zinc-100">
            {user?.first_name?.charAt(0)}{user?.last_name?.charAt(0)}
          </div>
          <div>
            <h2 className="text-base font-bold text-zinc-100">{user?.first_name} {user?.last_name}</h2>
            <p className="text-xs text-zinc-400">{user?.email}</p>
            <div className="mt-1">
              <Badge variant="info" size="sm">CLIENT</Badge>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateProfileMutation.mutate();
          }}
          className="space-y-5"
        >
          {/* Personal Information */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>Personal Information</span>
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
              label="Phone Number"
              type="tel"
              placeholder="+1-555-0199"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leftIcon={<Phone className="w-3.5 h-3.5 text-zinc-400" />}
            />
          </div>

          {/* Service Address */}
          <div className="space-y-3 pt-4 border-t border-zinc-800">
            <h3 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              <span>Default Service Address</span>
            </h3>

            <Input
              label="Street Address"
              placeholder="e.g. 742 Evergreen Terrace"
              value={addressLine1}
              onChange={(e) => setAddressLine1(e.target.value)}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="City"
                placeholder="Springfield"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <Input
                label="Postal Code"
                placeholder="97477"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
              />
              <Input
                label="Country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="md"
              className="w-full sm:w-auto"
              isLoading={updateProfileMutation.isPending}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Profile Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
