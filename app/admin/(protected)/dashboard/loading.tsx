export default function DashboardLoading() {
  return (
    <div className="px-8 py-8 md:px-12 max-w-7xl mx-auto animate-pulse">
      {/* Header */}
      <div className="mb-8">
        <div className="h-7 w-32 bg-muted rounded mb-2" />
        <div className="h-4 w-48 bg-muted rounded" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-card border border-border rounded-lg p-5">
            <div className="h-3 w-24 bg-muted rounded mb-3" />
            <div className="h-8 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table Skeleton */}
        <div className="lg:col-span-2 space-y-4">
          <div className="h-5 w-40 bg-muted rounded" />
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-full bg-muted rounded opacity-60" />
            <div className="h-4 w-full bg-muted rounded opacity-40" />
            <div className="h-4 w-full bg-muted rounded opacity-20" />
          </div>
        </div>

        {/* Sidebar Skeleton */}
        <div className="space-y-4">
          <div className="h-5 w-32 bg-muted rounded" />
          <div className="bg-card border border-border rounded-lg p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="h-3 w-28 bg-muted rounded" />
                <div className="h-3 w-8 bg-muted rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
