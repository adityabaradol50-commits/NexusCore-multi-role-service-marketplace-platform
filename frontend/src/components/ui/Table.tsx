'use client';

import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function Table({ children, className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-900/40">
      <table className={twMerge(clsx('w-full text-left border-collapse text-xs', className))} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={twMerge(clsx('bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 font-medium uppercase tracking-wider text-[11px]', className))} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={twMerge(clsx('divide-y divide-zinc-800/60 text-zinc-300', className))} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={twMerge(clsx('hover:bg-zinc-800/40 transition-colors group', className))} {...props}>
      {children}
    </tr>
  );
}

export function TableHead({ children, className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={twMerge(clsx('px-4 py-3 font-semibold text-zinc-400 select-none', className))} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ children, className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={twMerge(clsx('px-4 py-3 align-middle font-normal text-zinc-300', className))} {...props}>
      {children}
    </th>
  );
}
