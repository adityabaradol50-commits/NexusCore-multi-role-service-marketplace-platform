'use client';

import React from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardShell, { NavItem } from '@/components/layout/DashboardShell';
import { 
  Home, Building, Layers, Inbox, Users, CreditCard, 
  TrendingUp, Star, Bell, Settings, ShieldCheck 
} from 'lucide-react';

const clientNav: NavItem[] = [
  { label: 'Dashboard', href: '/client/dashboard', icon: Home },
  { label: 'Business Profile', href: '/client/profile', icon: Building },
  { label: 'My Services', href: '/client/services', icon: Layers },
  { label: 'Booking Requests', href: '/client/requests', icon: Inbox },
  { label: 'Customers', href: '/client/customers', icon: Users },
  { label: 'Payments', href: '/client/payments', icon: CreditCard },
  { label: 'Revenue', href: '/client/revenue', icon: TrendingUp },
  { label: 'Reviews', href: '/client/reviews', icon: Star },
  { label: 'Admin Command Center', href: '/admin/dashboard', icon: ShieldCheck },
  { label: 'Notifications', href: '/client/notifications', icon: Bell },
  { label: 'Settings', href: '/client/settings', icon: Settings },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['client']}>
      <DashboardShell
        roleTitle="Owner Portal"
        roleBadgeColor="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
        roleBadgeText="OWNER"
        navItems={clientNav}
      >
        {children}
      </DashboardShell>
    </ProtectedRoute>
  );
}
