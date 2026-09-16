'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { 
  Menu, X, Bell, LogOut, ChevronRight, AlertTriangle, 
  CheckCircle2, AlertOctagon, UserCircle, ShieldCheck, Building
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
}

interface DashboardShellProps {
  roleTitle: string;
  roleBadgeColor: string;
  roleBadgeText?: string;
  navItems: NavItem[];
  children: React.ReactNode;
}

export default function DashboardShell({
  roleTitle,
  roleBadgeColor,
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
  const formattedBreadcrumb = currentSegment.charAt(0).toUpperCase() + currentSegment.slice(1).replace('-', ' ');

  const handleLogout = () => {
    logout();
    showToast('Signed out successfully', 'info');
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 1. Sidebar Navigation (Desktop Fixed & Mobile Drawer) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-black text-white shadow-md shadow-indigo-600/20">
                N
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-white">Nexus<span className="text-indigo-400">Core</span></span>
                <span className="block text-[10px] text-slate-400 font-medium tracking-wide uppercase">{roleTitle}</span>
              </div>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1 rounded text-slate-400 hover:text-white md:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links (Role-Aware Enforced) */}
          <nav className="p-3 space-y-1">
            {navItems
              .filter((item) => {
                if (user?.role === 'consumer') {
                  return !item.href.startsWith('/client') && !item.href.startsWith('/admin') && !item.href.startsWith('/owner');
                }
                if (user?.role === 'client') {
                  // Owner can access BOTH Owner (/client) and Admin (/admin) routes
                  return !item.href.startsWith('/consumer');
                }
                if (user?.role === 'admin') {
                  // Admin accesses only Admin routes
                  return !item.href.startsWith('/consumer') && !item.href.startsWith('/client') && !item.href.startsWith('/owner');
                }
                return true;
              })
              .map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== `/${user?.role}/dashboard` && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-indigo-300 border border-slate-700">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer User Card & Logout */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
              user?.role === 'client'
                ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                : user?.role === 'admin'
                ? 'bg-rose-500/20 border border-rose-500/30 text-rose-300'
                : 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300'
            }`}>
              {user?.role === 'client' && user?.client_profile?.business_name
                ? user.client_profile.business_name.charAt(0)
                : user?.first_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {user?.role === 'client' && user?.client_profile?.business_name
                  ? user.client_profile.business_name
                  : `${user?.first_name || ''} ${user?.last_name || ''}`}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {user?.role === 'client'
                  ? `Owner: ${user?.first_name} ${user?.last_name}`
                  : user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full py-2 px-3 rounded-lg text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/40 transition-all flex items-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white md:hidden border border-slate-700"
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="capitalize">{roleTitle}</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
              <span className="font-semibold text-white">{formattedBreadcrumb}</span>
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-3">
            {user?.role === 'client' && user?.client_profile?.business_name && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                <span className="font-bold text-white">{user.client_profile.business_name}</span>
                <span className="text-slate-500">·</span>
                <span className="text-emerald-300 font-medium">Owner: {user.first_name} {user.last_name}</span>
              </div>
            )}

            {/* Quick Access Switcher for Owner (Owner + Admin Access Model) */}
            {user?.role === 'client' && (
              pathname.startsWith('/admin') ? (
                <Link
                  href="/client/dashboard"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-all"
                  title="Switch to Owner Portal"
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>Owner Portal</span>
                </Link>
              ) : (
                <Link
                  href="/admin/dashboard"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all"
                  title="Open Admin Command Center"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Admin Portal</span>
                </Link>
              )
            )}

            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${roleBadgeColor}`}>
              {roleBadgeText || (user?.role === 'client' ? 'OWNER' : user?.role === 'consumer' ? 'CLIENT' : 'ADMIN')}
            </span>

            <Link
              href={`/${user?.role}/notifications`}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 relative transition-colors"
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
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-xs text-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Business Verification Pending: </span>
                  Your account is currently undergoing administrative review. Offering creation and customer orders are paused until verification is complete.
                </div>
              </div>
            )}

            {user.client_profile?.approval_status === 'REJECTED' && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-xs text-rose-200">
                <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Application Status: Rejected. </span>
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Confirm Sign Out</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Are you sure you want to end your active session? You will need to sign in again to access your dashboard.
            </p>
            <div className="flex justify-end gap-2.5 pt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
