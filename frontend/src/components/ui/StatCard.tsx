'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ReactNode;
  iconBg?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  change,
  changeType = 'neutral',
  icon,
  iconBg = 'bg-zinc-800 text-zinc-300 border-zinc-700',
  className,
}: StatCardProps) {
  return (
    <div className={twMerge(clsx('bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between space-y-3 transition-all hover:border-zinc-700/80', className))}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{title}</span>
        {icon && (
          <div className={twMerge(clsx('w-9 h-9 rounded-lg border flex items-center justify-center text-sm', iconBg))}>
            {icon}
          </div>
        )}
      </div>

      <div>
        <div className="text-2xl font-bold text-zinc-100 tracking-tight">{value}</div>
        {(subtitle || change) && (
          <div className="flex items-center gap-1.5 mt-1 text-xs">
            {change && (
              <span className={`font-semibold ${
                changeType === 'positive' ? 'text-emerald-400' :
                changeType === 'negative' ? 'text-rose-400' : 'text-zinc-400'
              }`}>
                {change}
              </span>
            )}
            {subtitle && <span className="text-zinc-500">{subtitle}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
