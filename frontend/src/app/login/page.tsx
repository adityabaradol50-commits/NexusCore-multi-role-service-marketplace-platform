'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth, RegisterPayload } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { 
  Lock, Mail, ArrowRight, AlertCircle, 
  Eye, EyeOff, Sparkles, User, Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

function LoginContent() {
  const { user, login, register, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();

  const tabParam = searchParams.get('tab');
  const [authMode, setAuthMode] = useState<'signin' | 'register'>(tabParam === 'register' ? 'register' : 'signin');
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

  useEffect(() => {
    if (!isLoading && user) {
      if (returnUrl && !returnUrl.startsWith('/login')) {
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
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 font-sans selection:bg-indigo-500/30 selection:text-white">
      <div className="max-w-md w-full space-y-5">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-base">
              N
            </div>
            <span className="font-bold text-xl tracking-tight text-white">Nexus<span className="text-indigo-400">Core</span></span>
          </Link>
          <p className="text-xs text-zinc-400">Specialized Service Marketplace</p>
        </div>

        {/* Auth Card */}
        <Card className="p-6 sm:p-7 space-y-5">
          {/* Mode Switcher */}
          <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
            <button
              type="button"
              onClick={() => { setAuthMode('signin'); setErrorMessage(null); }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                authMode === 'signin' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setAuthMode('register'); setErrorMessage(null); }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                authMode === 'register' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Register
            </button>
          </div>

          {/* Quick Demo Access */}
          {authMode === 'signin' && (
            <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-lg space-y-2">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Demo One-Click Credentials</span>
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('alex.client@nexuscore.com');
                    setPassword('ClientPassword123!');
                    setErrorMessage(null);
                  }}
                  className="py-1 px-2 rounded-md bg-zinc-900 hover:bg-indigo-600/20 text-zinc-300 hover:text-white border border-zinc-800 text-[11px] font-medium transition-all text-center cursor-pointer"
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
                  className="py-1 px-2 rounded-md bg-zinc-900 hover:bg-emerald-600/20 text-zinc-300 hover:text-white border border-zinc-800 text-[11px] font-medium transition-all text-center cursor-pointer"
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
                  className="py-1 px-2 rounded-md bg-zinc-900 hover:bg-rose-600/20 text-zinc-300 hover:text-white border border-zinc-800 text-[11px] font-medium transition-all text-center cursor-pointer"
                >
                  Admin
                </button>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {authMode === 'register' && (
              <>
                {/* Role Picker */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-zinc-300">Account Role</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('consumer')}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        role === 'consumer'
                          ? 'bg-indigo-600/10 border-indigo-500 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-zinc-200">
                        <User className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Client</span>
                      </div>
                      <span className="block text-[11px] text-zinc-500 mt-0.5">Book services</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('client')}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        role === 'client'
                          ? 'bg-emerald-600/10 border-emerald-500 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-xs text-zinc-200">
                        <Briefcase className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Owner</span>
                      </div>
                      <span className="block text-[11px] text-zinc-500 mt-0.5">Offer services</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="First Name *"
                    required
                    placeholder="Jane"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                  <Input
                    label="Last Name *"
                    required
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>

                {role === 'client' && (
                  <div className="space-y-3 pt-1 border-t border-zinc-800">
                    <Input
                      label="Business Name *"
                      required
                      placeholder="e.g. Sungmo Heals"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                    />
                    <Input
                      label="Service Area"
                      placeholder="e.g. Online Sessions or New York"
                      value={serviceArea}
                      onChange={(e) => setServiceArea(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}

            <Input
              label="Email Address *"
              type="email"
              required
              placeholder="name@domain.com"
              leftIcon={<Mail className="w-4 h-4 text-zinc-400" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <div>
              <Input
                label={`Password * ${authMode === 'register' ? '(Min 8 chars)' : ''}`}
                type={showPassword ? 'text' : 'password'}
                required
                minLength={authMode === 'register' ? 8 : undefined}
                placeholder="••••••••"
                leftIcon={<Lock className="w-4 h-4 text-zinc-400" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              className="w-full mt-2"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {authMode === 'signin' ? 'Sign In' : 'Create Verified Account'}
            </Button>
          </form>
        </Card>

        <div className="text-center">
          <Link href="/" className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
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
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-zinc-400">Loading sign-in portal...</p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
