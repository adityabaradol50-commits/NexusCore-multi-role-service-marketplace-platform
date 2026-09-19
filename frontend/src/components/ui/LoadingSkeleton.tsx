'use client';

import React from 'react';

export function CardSkeleton() {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 space-y-4 animate-pulse">
      <div className="h-4 bg-zinc-800 rounded-md w-1/3" />
      <div className="h-7 bg-zinc-800 rounded-md w-1/2" />
      <div className="h-3 bg-zinc-800/60 rounded-md w-2/3" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-5 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-5 bg-zinc-800 rounded-md w-1/4" />
        <div className="h-8 bg-zinc-800 rounded-md w-28" />
      </div>
      <div className="space-y-2.5 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-10 bg-zinc-800/50 rounded-lg w-full" />
        ))}
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
