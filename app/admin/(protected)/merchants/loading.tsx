export default function MerchantsLoading() {
  return (
    <div className="px-6 py-8 animate-pulse max-w-7xl mx-auto space-y-8 font-sans">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <div className="h-3 w-32 bg-muted rounded" />
          <div className="h-8 w-48 bg-muted rounded" />
        </div>
        <div className="h-4 w-20 bg-muted rounded" />
      </div>

      <div className="bg-card border border-border rounded-lg p-4 flex gap-4">
        <div className="h-10 flex-1 bg-muted rounded" />
        <div className="h-10 w-32 bg-muted rounded" />
      </div>

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="h-12 bg-muted/60 border-b border-border" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-20 border-b border-border flex items-center px-6 gap-8">
            <div className="flex-1 h-5 bg-muted rounded" />
            <div className="w-48 h-5 bg-muted rounded" />
            <div className="w-24 h-5 bg-muted rounded" />
            <div className="w-32 h-5 bg-muted rounded" />
            <div className="w-24 h-5 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
