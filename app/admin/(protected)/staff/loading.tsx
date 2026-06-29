export default function StaffLoading() {
  return (
    <div className="px-8 py-8 md:px-12 animate-pulse max-w-7xl mx-auto space-y-10">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <div className="h-3 w-32 bg-muted rounded" />
          <div className="h-10 w-48 bg-muted rounded" />
        </div>
        <div className="h-12 w-44 bg-muted rounded-xl" />
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="h-16 bg-muted/50 border-b border-border" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 border-b border-border flex items-center px-8 gap-10">
            <div className="w-10 h-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
               <div className="h-4 w-40 bg-muted rounded" />
               <div className="h-3 w-32 bg-muted rounded opacity-50" />
            </div>
            <div className="w-24 h-5 bg-muted rounded" />
            <div className="w-32 h-5 bg-muted rounded" />
            <div className="w-10 h-10 bg-muted rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
