'use client';

import React from 'react';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import DashboardShell, { NavItem } from '@/components/layout/DashboardShell';
import { useAuth } from '@/context/AuthContext';
import { 
  Home, Users, Building, ShieldCheck, Layers, 
  ShoppingBag, CreditCard, Star, FileText, Settings, Bell, ArrowLeft
} from 'lucide-react';

const baseAdminNav: NavItem[] = [
  { label: 'Dashboard Overview', href: '/admin/dashboard', icon: Home },
  { label: 'Clients / Customers', href: '/admin/consumers', icon: Users },
  { label: 'Owners / Businesses', href: '/admin/clients', icon: Building },
  { label: 'Owner Approvals', href: '/admin/client-approval', icon: ShieldCheck },
  { label: 'Services & Catalog', href: '/admin/services', icon: Layers },
  { label: 'Orders & Requests', href: '/admin/orders', icon: ShoppingBag },
  { label: 'Payments & Split', href: '/admin/payments', icon: CreditCard },
  { label: 'Reviews', href: '/admin/reviews', icon: Star },
  { label: 'Audit Logs', href: '/admin/audit-logs', icon: FileText },
  { label: 'Notifications', href: '/admin/notifications', icon: Bell },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const isOwner = user?.role === 'client';

  // For Owners accessing the Admin portal, provide a convenient return link to their Owner portal
  const navItems: NavItem[] = isOwner
    ? [
        { label: '← Return to Owner Portal', href: '/client/dashboard', icon: ArrowLeft },
        ...baseAdminNav
      ]
    : baseAdminNav;

  return (
    <ProtectedRoute allowedRoles={['admin', 'client']}>
      <DashboardShell
        roleTitle={isOwner ? 'Platform Governance (Owner Access)' : 'Admin Command Center'}
        roleBadgeColor={
          isOwner
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
        }
        roleBadgeText={isOwner ? 'OWNER (ADMIN)' : 'ADMIN'}
        navItems={navItems}
      >
        {children}
      </DashboardShell>
    </ProtectedRoute>
  );
}
