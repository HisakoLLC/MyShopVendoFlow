import { Skeleton } from "@/components/ui/skeleton"

export function ProductsListSkeleton() {
  return (
    <div className="min-h-screen bg-background text-foreground px-8 py-8">
      <div className="flex items-start justify-between pb-6 mb-6 border-b border-border">
        <div className="space-y-2">
          <Skeleton className="h-3 w-48 bg-muted" />
          <Skeleton className="h-8 w-32 bg-muted" />
        </div>
        <Skeleton className="h-9 w-36 bg-muted rounded-sm" />
      </div>

      <div className="mb-4 h-11 w-full max-w-xl rounded-md bg-card border border-border" />

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b-2 border-border bg-card px-4 py-3">
          <Skeleton className="h-3 w-24 bg-muted" />
        </div>
        <div className="divide-y divide-border/40">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 px-4 py-3.5">
              <Skeleton className="h-10 w-10 rounded-md bg-muted" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-[250px] bg-muted" />
                <Skeleton className="h-3 w-[150px] bg-muted opacity-50" />
              </div>
              <Skeleton className="h-6 w-20 bg-muted rounded-full" />
              <Skeleton className="h-8 w-8 bg-muted rounded-sm" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
