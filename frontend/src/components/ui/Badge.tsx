'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export type BadgeVariant =
  | 'default'
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  status?: string;
}

export function Badge({
  children,
  variant,
  size = 'md',
  status,
  className,
  ...props
}: BadgeProps) {
  // Infer variant from backend status code if provided
  let computedVariant: BadgeVariant = variant || 'default';

  if (status) {
    const s = status.toUpperCase();
    if (['APPROVED', 'COMPLETED', 'PAID', 'ACTIVE', 'VERIFIED'].includes(s)) {
      computedVariant = 'success';
    } else if (['PENDING', 'PENDING_APPROVAL', 'REQUESTED', 'PROCESSING'].includes(s)) {
      computedVariant = 'warning';
    } else if (['REJECTED', 'CANCELLED', 'REFUNDED', 'SUSPENDED', 'FAILED', 'INACTIVE'].includes(s)) {
      computedVariant = 'danger';
    } else if (['IN_PROGRESS', 'ADMIN', 'OWNER'].includes(s)) {
      computedVariant = 'primary';
    } else if (['CLIENT', 'CONSUMER'].includes(s)) {
      computedVariant = 'info';
    } else {
      computedVariant = 'neutral';
    }
  }

  const baseStyles = 'inline-flex items-center font-medium rounded-full tracking-wide select-none border';

  const variants: Record<BadgeVariant, string> = {
    default: 'bg-zinc-800/80 text-zinc-300 border-zinc-700/60',
    primary: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
    success: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    danger: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
    info: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
    neutral: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  };

  const sizes = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-0.5 gap-1.5',
  };

  return (
    <span
      className={twMerge(clsx(baseStyles, variants[computedVariant], sizes[size], className))}
      {...props}
    >
      {children || status}
    </span>
  );
}
