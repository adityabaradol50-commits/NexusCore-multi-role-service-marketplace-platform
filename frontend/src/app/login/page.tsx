'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth, RegisterPayload } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { 
  Lock, Mail, User, Briefcase, ArrowRight, AlertCircle, 
  CheckCircle2, ShieldCheck, Layers, Eye, EyeOff, Sparkles 
} from 'lucide-react';

function LoginContent() {
  const { user, login, register, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');
  const [role, setRole] = useState<'consumer' | 'client'>('consumer');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [bio, setBio] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const returnUrl = searchParams.get('returnUrl');
  const expired = searchParams.get('expired');

  useEffect(() => {
    if (expired) {
      setErrorMessage('Your session has expired. Please sign in again.');
    }
  }, [expired]);

  // If already logged in, redirect to correct portal
  useEffect(() => {
    if (!isLoading && user) {
      if (returnUrl && !returnUrl.startsWith('/login')) {
        // Enforce strict role boundary on returnUrl so clients cannot be redirected to owner/admin portals
        if (user.role === 'consumer' && (returnUrl.startsWith('/client') || returnUrl.startsWith('/admin') || returnUrl.startsWith('/owner'))) {
          router.replace('/consumer/dashboard');
        } else if (user.role === 'client' && (returnUrl.startsWith('/admin') || returnUrl.startsWith('/consumer'))) {
          router.replace('/client/dashboard');
        } else {
          router.replace(returnUrl);
        }
      } else {
        const dest = user.role === 'admin' ? '/admin/dashboard' : user.role === 'client' ? '/client/dashboard' : '/consumer/dashboard';
        router.replace(dest);
      }
    }
  }, [user, isLoading, router, returnUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      if (authMode === 'signin') {
        if (!email || !password) {
          setErrorMessage('Please provide both email and password.');
          setIsSubmitting(false);
          return;
        }
        await login(email, password);
        showToast('Signed in successfully', 'success');
      } else {
        if (!email || !password || !firstName || !lastName) {
          setErrorMessage('Please fill in all required fields.');
          setIsSubmitting(false);
          return;
        }
        if (password.length < 8) {
          setErrorMessage('Password must be at least 8 characters long.');
          setIsSubmitting(false);
          return;
        }
        if (role === 'client' && !businessName.trim()) {
          setErrorMessage('Business name is required for client providers.');
          setIsSubmitting(false);
          return;
        }

        const payload: RegisterPayload = {
          email: email.trim().toLowerCase(),
          password,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || undefined,
          role,
          business_name: role === 'client' ? businessName.trim() : undefined,
          bio: role === 'client' ? bio.trim() : undefined,
          service_area: role === 'client' ? serviceArea.trim() : undefined,
        };

        await register(payload);
        showToast('Account registered successfully', 'success');
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setErrorMessage(typeof detail === 'string' ? detail : 'Authentication failed. Please verify credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-indigo-600 selection:text-white">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center font-black text-white shadow-lg shadow-indigo-600/30">
              N
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-white">Nexus<span className="text-indigo-400">Core</span></span>
          </Link>
          <p className="text-xs text-slate-400">Specialized Service Marketplace</p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-5 shadow-2xl">
          {/* Mode Switcher */}
          <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            <button
              type="button"
              onClick={() => { setAuthMode('signin'); setErrorMessage(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'signin' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setErrorMessage(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authMode === 'register' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Register
            </button>
          </div>

          {/* Quick Demo Access (for convenient evaluation) */}
          {authMode === 'signin' && (
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Demo One-Click Sign In</span>
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('alex.client@nexuscore.com');
                    setPassword('ClientPassword123!');
                    setErrorMessage(null);
                  }}
                  className="py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-indigo-600/20 text-slate-300 hover:text-white border border-slate-700/60 text-[11px] font-semibold transition-all text-center"
                >
                  Client
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('snigdhahealer157@gmail.com');
                    setPassword('SungmoPassword123!');
                    setErrorMessage(null);
                  }}
                  className="py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-emerald-600/20 text-slate-300 hover:text-white border border-slate-700/60 text-[11px] font-semibold transition-all text-center"
                >
                  Sungmo (Owner)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@nexuscore.com');
                    setPassword('AdminPassword123!');
                    setErrorMessage(null);
                  }}
                  className="py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-rose-600/20 text-slate-300 hover:text-white border border-slate-700/60 text-[11px] font-semibold transition-all text-center"
                >
                  Admin
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === 'register' && (
              <>
                {/* Account Type Selection */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">Account Role</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('consumer')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        role === 'consumer'
                          ? 'bg-indigo-600/20 border-indigo-500 text-white'
                          : 'bg-slate-800/40 border-slate-700 text-slate-400'
                      }`}
                    >
                      <span className="block text-xs font-bold">Client</span>
                      <span className="block text-[11px] text-slate-400">Book services</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('client')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        role === 'client'
                          ? 'bg-emerald-600/20 border-emerald-500 text-white'
                          : 'bg-slate-800/40 border-slate-700 text-slate-400'
                      }`}
                    >
                      <span className="block text-xs font-bold">Owner</span>
                      <span className="block text-[11px] text-slate-400">Offer services</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Jane"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {role === 'client' && (
                  <div className="space-y-3 pt-1 border-t border-slate-800">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Business Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Sungmo Heals"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Service Area</label>
                      <input
                        type="text"
                        placeholder="e.g. Online Sessions or New York"
                        value={serviceArea}
                        onChange={(e) => setServiceArea(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address *</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password * {authMode === 'register' && <span className="text-slate-400 font-normal">(Min 8 chars)</span>}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={authMode === 'register' ? 8 : undefined}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-2"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{authMode === 'signin' ? 'Sign In' : 'Create Verified Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center">
          <Link href="/" className="text-xs text-slate-400 hover:text-white transition-colors">
            ← Return to Home Overview
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-xs text-slate-400">Loading sign-in portal...</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

