export default function ReportsLoading() {
  return (
    <div className="px-8 py-8 md:px-12 max-w-7xl mx-auto animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div className="space-y-2">
          <div className="h-3 w-32 bg-muted rounded" />
          <div className="h-8 w-48 bg-muted rounded" />
        </div>
        <div className="h-10 w-40 bg-muted rounded" />
      </div>

      {/* Filter Bar */}
      <div className="bg-card border border-border rounded-lg p-4 mb-8 space-y-4">
        <div className="flex gap-4">
           {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 w-20 bg-muted rounded" />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-4">
           {[...Array(4)].map((_, i) => (
            <div key={i} className="h-9 bg-muted rounded" />
          ))}
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="h-12 bg-muted/60 border-b border-border" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-16 border-b border-border flex items-center px-6 gap-8">
            <div className="w-24 h-4 bg-muted rounded" />
            <div className="flex-1 h-4 bg-muted rounded" />
            <div className="w-32 h-4 bg-muted rounded" />
            <div className="w-20 h-6 bg-muted/80 rounded" />
            <div className="w-24 h-4 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
