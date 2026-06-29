export default function FinanceLoading() {
  return (
    <div className="px-8 py-8 animate-pulse max-w-7xl mx-auto space-y-12">
      <div className="space-y-2">
        <div className="h-3 w-32 bg-muted rounded" />
        <div className="h-10 w-64 bg-muted rounded" />
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-card border border-border rounded-2xl" />
        ))}
      </div>

      <div className="h-[300px] bg-card border border-border rounded-2xl" />

      <div className="space-y-4">
        <div className="h-4 w-40 bg-muted rounded" />
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="h-16 border-b border-border" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 border-b border-border flex items-center px-10 gap-10">
              <div className="w-40 h-5 bg-muted rounded" />
              <div className="flex-1 h-5 bg-muted rounded" />
              <div className="w-32 h-5 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
