import { Skeleton } from "@/components/ui/skeleton"

export function ProductsListSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-950 px-8 py-8">
      <div className="flex items-start justify-between pb-6 mb-6 border-b border-zinc-800">
        <div className="space-y-2">
          <Skeleton className="h-3 w-48 bg-zinc-800" />
          <Skeleton className="h-8 w-32 bg-zinc-800" />
        </div>
        <Skeleton className="h-9 w-36 bg-zinc-800 rounded-sm" />
      </div>

      <div className="mb-4 h-11 w-full max-w-xl rounded-md bg-zinc-900 border border-zinc-800" />

      <div className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
        <div className="border-b-2 border-zinc-700 bg-zinc-900 px-4 py-3">
          <Skeleton className="h-3 w-24 bg-zinc-800" />
        </div>
        <div className="divide-y divide-zinc-800/40">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 px-4 py-3.5">
              <Skeleton className="h-10 w-10 rounded-md bg-zinc-800" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-[250px] bg-zinc-800" />
                <Skeleton className="h-3 w-[150px] bg-zinc-800 opacity-50" />
              </div>
              <Skeleton className="h-6 w-20 bg-zinc-800 rounded-full" />
              <Skeleton className="h-8 w-8 bg-zinc-800 rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
