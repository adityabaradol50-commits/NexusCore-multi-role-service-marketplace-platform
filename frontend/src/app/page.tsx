'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { 
  ShieldCheck, Briefcase, User, ArrowRight, CheckCircle2, 
  Sparkles, ChevronRight, Lock, Activity, Star, Menu, X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'admin') {
        router.replace('/admin/dashboard');
      } else if (user.role === 'client') {
        router.replace('/client/dashboard');
      } else {
        router.replace('/consumer/dashboard');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs text-zinc-400 font-medium">Resolving authorization session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white">
      {/* Mobile Nav Backdrop Overlay */}
      {mobileNavOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/75 backdrop-blur-xs md:hidden animate-in fade-in duration-150"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-30 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-8 lg:px-12 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-sm shadow-xs">
            N
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight text-white">Nexus<span className="text-indigo-400">Core</span></span>
            <Badge variant="primary" size="sm" className="hidden sm:inline-flex">Service Marketplace</Badge>
          </div>
        </div>

        {/* Desktop Header Actions */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <Link href={user.role === 'admin' ? '/admin/dashboard' : user.role === 'client' ? '/client/dashboard' : '/consumer/dashboard'}>
              <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                {user.role === 'consumer' ? 'Go to Client Dashboard' : user.role === 'client' ? 'Go to Owner Dashboard' : 'Go to Admin Dashboard'}
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="outline" size="sm">Sign In</Button>
              </Link>
              <Link href="/login?tab=register">
                <Button variant="primary" size="sm" rightIcon={<ChevronRight className="w-3.5 h-3.5" />}>
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="p-2 rounded-lg bg-zinc-800 text-zinc-300 hover:text-white md:hidden border border-zinc-700/80 touch-target flex items-center justify-center"
          aria-label="Toggle Navigation Menu"
        >
          {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileNavOpen && (
        <div className="fixed top-[57px] inset-x-0 z-50 bg-zinc-900 border-b border-zinc-800 p-4 md:hidden space-y-3 shadow-2xl animate-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Quick Navigation</span>
            <Badge variant="primary" size="sm">v1.0 SaaS</Badge>
          </div>
          <div className="space-y-2">
            {user ? (
              <Link href={user.role === 'admin' ? '/admin/dashboard' : user.role === 'client' ? '/client/dashboard' : '/consumer/dashboard'} onClick={() => setMobileNavOpen(false)}>
                <Button variant="primary" size="md" className="w-full justify-between">
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileNavOpen(false)} className="block">
                  <Button variant="outline" size="md" className="w-full justify-center">
                    Sign In
                  </Button>
                </Link>
                <Link href="/login?tab=register" onClick={() => setMobileNavOpen(false)} className="block">
                  <Button variant="primary" size="md" className="w-full justify-center" rightIcon={<ChevronRight className="w-4 h-4" />}>
                    Get Started (Free)
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 lg:px-12 py-10 sm:py-16 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto space-y-4 sm:space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Enterprise On-Demand Service Marketplace</span>
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
            Specialized Services & Verified <span className="text-indigo-400">Professional Providers</span>
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            NexusCore connects clients with vetted specialists across personal wellness, advisory, and home services. Featuring secure escrow payments, instant appointment scheduling, and transparent business operations.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 w-full sm:w-auto">
            <Link href="/login" className="w-full sm:w-auto">
              <Button variant="primary" size="lg" className="w-full sm:w-auto" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Explore Services & Portals
              </Button>
            </Link>
            <Link href="/login?tab=register" className="w-full sm:w-auto">
              <Button variant="secondary" size="lg" className="w-full sm:w-auto">
                Create Verified Account
              </Button>
            </Link>
          </div>
        </div>

        {/* 3 Portals Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mt-12 sm:mt-16">
          {/* Client / Consumer */}
          <Card hoverEffect className="space-y-4">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <Badge variant="info" size="sm">CLIENT MARKETPLACE</Badge>
              <h3 className="text-base font-semibold text-zinc-100 mt-1">Consumer Portal</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Discover verified service offerings, request appointments, manage orders, and leave verified ratings.
              </p>
            </div>
            <div className="pt-3 border-t border-zinc-800/60 space-y-2 text-xs text-zinc-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Search & Filter Catalog</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Escrow-Protected Booking</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>Verified Service Reviews</span>
              </div>
            </div>
          </Card>

          {/* Owner / Business */}
          {user?.role !== 'consumer' && (
            <Card hoverEffect className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <Badge variant="success" size="sm">OWNER PORTAL</Badge>
                <h3 className="text-base font-semibold text-zinc-100 mt-1">Business Management</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Manage service offerings, review booking requests, track client spend, and withdraw net earnings.
                </p>
              </div>
              <div className="pt-3 border-t border-zinc-800/60 space-y-2 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Catalog & Pricing Manager</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Booking Request Queue</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>90% Earnings Payout Ledger</span>
                </div>
              </div>
            </Card>
          )}

          {/* Admin */}
          {user?.role !== 'consumer' && (
            <Card hoverEffect className="space-y-4">
              <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <Badge variant="danger" size="sm">ADMIN GOVERNANCE</Badge>
                <h3 className="text-base font-semibold text-zinc-100 mt-1">Platform Governance</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                  Oversight of provider vetting, master transaction ledgers, category governance, and immutable audit logs.
                </p>
              </div>
              <div className="pt-3 border-t border-zinc-800/60 space-y-2 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Owner Vetting & Approvals</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Platform Volume & 10% Fee Take</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span>Immutable Governance Audit Trail</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 px-4 sm:px-8 lg:px-12 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 text-center sm:text-left">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
          <span>NexusCore Marketplace Platform</span>
          <span className="hidden sm:inline">•</span>
          <span>10% Platform Fee / 90% Owner Share</span>
          <span className="hidden sm:inline">•</span>
          <span>Escrow Protected</span>
        </div>
        <div>Commercial On-Demand Service Platform</div>
      </footer>
    </div>
  );
}
