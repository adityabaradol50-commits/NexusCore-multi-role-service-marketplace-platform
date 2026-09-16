'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api';

export interface ConsumerProfile {
  id: string;
  avatar_url?: string;
  address_line1?: string;
  city?: string;
  postal_code?: string;
  country?: string;
}

export interface ClientProfile {
  id: string;
  business_name: string;
  business_registration_no?: string;
  bio?: string;
  logo_url?: string;
  service_area?: string;
  approval_status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  rejection_reason?: string;
  available_balance: number;
}

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'admin' | 'client' | 'consumer';
  status: string;
  created_at: string;
  consumer_profile?: ConsumerProfile;
  client_profile?: ClientProfile;
}

export interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: 'consumer' | 'client';
  business_name?: string;
  business_registration_no?: string;
  bio?: string;
  service_area?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch (err) {
      console.error('Session expired or invalid:', err);
      localStorage.removeItem('nexuscore_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('nexuscore_token');
    if (savedToken) {
      setToken(savedToken);
      fetchCurrentUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { access_token, refresh_token } = res.data;
    localStorage.setItem('nexuscore_token', access_token);
    if (refresh_token) {
      localStorage.setItem('nexuscore_refresh_token', refresh_token);
    }
    setToken(access_token);
    await fetchCurrentUser();
  };

  const register = async (payload: RegisterPayload) => {
    const res = await api.post('/auth/register', payload);
    const { access_token, refresh_token } = res.data;
    localStorage.setItem('nexuscore_token', access_token);
    if (refresh_token) {
      localStorage.setItem('nexuscore_refresh_token', refresh_token);
    }
    setToken(access_token);
    await fetchCurrentUser();
  };

  const logout = () => {
    localStorage.removeItem('nexuscore_token');
    localStorage.removeItem('nexuscore_refresh_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
