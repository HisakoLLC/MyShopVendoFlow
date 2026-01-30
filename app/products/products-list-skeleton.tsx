import { cn } from "@/lib/utils"

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800", className)}
      aria-hidden
    />
  )
}

export function ProductsListSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-12 w-36" />
      </div>

      {/* Filters bar skeleton */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex flex-wrap items-center gap-4">
          <Skeleton className="h-11 flex-1 min-w-[200px] lg:max-w-[50%]" />
          <Skeleton className="h-11 w-[200px]" />
          <Skeleton className="h-11 w-[200px]" />
        </div>
      </div>

      {/* Table skeleton — 10 rows */}
      <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:block">
        <div className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex gap-4 px-6 py-4">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-16 ml-auto" />
          </div>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-6 py-4">
              <Skeleton className="h-4 w-4 shrink-0" />
              <Skeleton className="h-[60px] w-[60px] shrink-0 rounded-lg" />
              <Skeleton className="h-4 w-48 flex-1 max-w-[200px]" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-5 w-12 rounded-full" />
              <Skeleton className="h-4 w-14" />
              <Skeleton className="h-4 w-16" />
              <div className="flex gap-1">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-800">
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-9" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-9" />
          </div>
        </div>
      </div>

      {/* Mobile card skeletons */}
      <div className="space-y-4 lg:hidden">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex gap-4">
              <Skeleton className="h-20 w-20 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-14 rounded-full" />
                </div>
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
              <Skeleton className="h-10 w-20 rounded-lg" />
              <Skeleton className="h-10 w-24 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
