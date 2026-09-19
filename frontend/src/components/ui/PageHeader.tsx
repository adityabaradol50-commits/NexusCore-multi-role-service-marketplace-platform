'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface PageHeaderProps {
  title: string;
  description?: string;
  badgeText?: string;
  badgeVariant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  badgeText,
  badgeVariant = 'primary',
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={twMerge(clsx('flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-800/60', className))}>
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">{title}</h1>
          {badgeText && (
            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${
              badgeVariant === 'primary' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
              badgeVariant === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
              badgeVariant === 'warning' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
              badgeVariant === 'danger' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
              'bg-zinc-800 text-zinc-300 border-zinc-700'
            }`}>
              {badgeText}
            </span>
          )}
        </div>
        {description && <p className="text-xs text-zinc-400 leading-relaxed">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0">{actions}</div>}
    </div>
  );
}
