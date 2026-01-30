"use client"

import { cn } from "@/lib/utils"

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800", className)}
      aria-hidden
    />
  )
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8 dark:bg-slate-950 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-5 w-72" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-10 w-28 shrink-0" />
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-[180px] rounded-xl" />
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Skeleton className="mb-2 h-6 w-36" />
            <Skeleton className="mb-4 h-4 w-24" />
            <Skeleton className="h-[320px] w-full rounded-lg" />
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <Skeleton className="mb-2 h-6 w-32" />
            <Skeleton className="mb-4 h-4 w-36" />
            <Skeleton className="h-[320px] w-full rounded-lg" />
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>

        {/* Recent sales */}
        <div>
          <Skeleton className="mb-4 h-7 w-32" />
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
