'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { 
  Menu, X, Bell, LogOut, ChevronRight, AlertTriangle, 
  CheckCircle2, AlertOctagon, ShieldCheck, Building, Sparkles
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
  category?: string;
}

interface DashboardShellProps {
  roleTitle: string;
  roleBadgeColor?: string;
  roleBadgeText?: string;
  navItems: NavItem[];
  children: React.ReactNode;
}

export default function DashboardShell({
  roleTitle,
  roleBadgeText,
  navItems,
  children,
}: DashboardShellProps) {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const pathname = usePathname();
  const router = useRouter();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Compute breadcrumbs
  const pathSegments = pathname.split('/').filter(Boolean);
  const currentSegment = pathSegments[pathSegments.length - 1] || 'Dashboard';
  const formattedBreadcrumb = currentSegment
    .replace('-', ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());

  const handleLogout = () => {
    logout();
    showToast('Signed out successfully', 'info');
    router.push('/login');
  };

  // Group navigation items by category
  const categories = Array.from(new Set(navItems.map((item) => item.category || 'Navigation')));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col md:flex-row font-sans selection:bg-indigo-500/30 selection:text-white">
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 1. Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 bg-zinc-900/90 border-r border-zinc-800 flex flex-col justify-between transition-transform duration-200 md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="px-5 py-4 border-b border-zinc-800/80 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow-xs group-hover:bg-indigo-500 transition-colors">
                N
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-white">Nexus<span className="text-indigo-400">Core</span></span>
                <span className="block text-[10px] text-zinc-400 font-medium uppercase tracking-wider">{roleTitle}</span>
              </div>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white md:hidden hover:bg-zinc-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links (Role-Aware Enforced) */}
          <nav className="p-3 space-y-4">
            {categories.map((category) => {
              const categoryItems = navItems.filter((item) => (item.category || 'Navigation') === category)
                .filter((item) => {
                  if (user?.role === 'consumer') {
                    return !item.href.startsWith('/client') && !item.href.startsWith('/admin') && !item.href.startsWith('/owner');
                  }
                  if (user?.role === 'client') {
                    return !item.href.startsWith('/consumer');
                  }
                  if (user?.role === 'admin') {
                    return !item.href.startsWith('/consumer') && !item.href.startsWith('/client') && !item.href.startsWith('/owner');
                  }
                  return true;
                });

              if (categoryItems.length === 0) return null;

              return (
                <div key={category} className="space-y-1">
                  <span className="px-3 text-[10px] font-semibold text-zinc-400 tracking-wider uppercase">
                    {category}
                  </span>
                  <div className="space-y-0.5 mt-1">
                    {categoryItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href || (item.href !== `/${user?.role}/dashboard` && pathname.startsWith(item.href));

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                            isActive
                              ? 'bg-indigo-600/15 text-indigo-300 font-semibold border-l-2 border-indigo-500 pl-2.5'
                              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-zinc-400'}`} />
                            <span>{item.label}</span>
                          </div>

                          {item.badge !== undefined && (
                            <span className="px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer User Card & Logout */}
        <div className="p-3 border-t border-zinc-800/80 space-y-2">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-zinc-950/50 border border-zinc-800/60">
            <div className="w-7 h-7 rounded-md bg-zinc-800 border border-zinc-700/60 flex items-center justify-center font-bold text-xs text-zinc-200 shrink-0">
              {user?.role === 'client' && user?.client_profile?.business_name
                ? user.client_profile.business_name.charAt(0)
                : user?.first_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-100 truncate">
                {user?.role === 'client' && user?.client_profile?.business_name
                  ? user.client_profile.business_name
                  : `${user?.first_name || ''} ${user?.last_name || ''}`}
              </p>
              <p className="text-[10px] text-zinc-400 truncate">
                {user?.role === 'client'
                  ? `Owner: ${user?.first_name} ${user?.last_name}`
                  : user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full py-1.5 px-2.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-zinc-900/80 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white md:hidden border border-zinc-700"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <span className="capitalize">{roleTitle}</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              <span className="font-semibold text-zinc-100">{formattedBreadcrumb}</span>
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-2.5">
            {user?.role === 'client' && user?.client_profile?.business_name && (
              <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
                <span className="font-semibold text-zinc-200">{user.client_profile.business_name}</span>
                <span className="text-zinc-600">·</span>
                <span className="text-emerald-400 text-[11px]">Verified Owner</span>
              </div>
            )}

            {/* Quick Access Switcher for Owner (Owner + Admin Access Model) */}
            {user?.role === 'client' && (
              pathname.startsWith('/admin') ? (
                <Link
                  href="/client/dashboard"
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-xs font-medium transition-all"
                  title="Switch to Owner Portal"
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Owner Portal</span>
                </Link>
              ) : (
                <Link
                  href="/admin/dashboard"
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-medium transition-all"
                  title="Open Admin Command Center"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin Portal</span>
                </Link>
              )
            )}

            <Badge status={user?.role === 'client' ? 'OWNER' : user?.role === 'consumer' ? 'CLIENT' : 'ADMIN'}>
              {roleBadgeText || (user?.role === 'client' ? 'OWNER' : user?.role === 'consumer' ? 'CLIENT' : 'ADMIN')}
            </Badge>

            <Link
              href={`/${user?.role}/notifications`}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700/80 text-zinc-300 border border-zinc-700/60 relative transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* Client Business Verification Banner (Conditional) */}
        {user?.role === 'client' && (
          <div className="px-4 sm:px-6 pt-4">
            {user.client_profile?.approval_status === 'PENDING_APPROVAL' && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3 text-xs text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Business Verification Pending: </span>
                  Your application is undergoing administrative review. Offering creation and customer orders are paused until verification is complete.
                </div>
              </div>
            )}

            {user.client_profile?.approval_status === 'REJECTED' && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-xs text-rose-200">
                <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Application Status: Rejected. </span>
                  {user.client_profile.rejection_reason || 'Business documentation could not be verified. Please update your business profile.'}
                </div>
              </div>
            )}

            {user.client_profile?.approval_status === 'APPROVED' && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2 text-xs text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified Business Partner — Catalog is active and accepting requests.</span>
              </div>
            )}
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>

      {/* 3. Confirmation Dialog for Logout */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-semibold text-zinc-100">Confirm Sign Out</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Are you sure you want to end your active session? You will need to sign in again to access your dashboard.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <Button onClick={() => setShowLogoutConfirm(false)} variant="secondary" size="sm">
                Cancel
              </Button>
              <Button onClick={handleLogout} variant="danger" size="sm">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
