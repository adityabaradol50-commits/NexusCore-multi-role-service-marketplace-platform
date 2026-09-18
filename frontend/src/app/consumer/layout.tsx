'use client';

import React from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardShell, { NavItem } from '@/components/layout/DashboardShell';
import { 
  Home, User, Search, ShoppingBag, Bell, Settings 
} from 'lucide-react';

const consumerNav: NavItem[] = [
  { label: 'Dashboard Home', href: '/consumer/dashboard', icon: Home },
  { label: 'My Profile', href: '/consumer/profile', icon: User },
  { label: 'Browse Services', href: '/consumer/browse', icon: Search },
  { label: 'Orders & Requests', href: '/consumer/orders', icon: ShoppingBag },
  { label: 'Notifications', href: '/consumer/notifications', icon: Bell },
  { label: 'Account Settings', href: '/consumer/settings', icon: Settings },
];

export default function ConsumerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute allowedRoles={['consumer']}>
      <DashboardShell
        roleTitle="Customer Portal"
        roleBadgeColor="bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
        roleBadgeText="CUSTOMER"
        navItems={consumerNav}
      >
        {children}
      </DashboardShell>
    </ProtectedRoute>
  );
}
