export default function SettingsLoading() {
  return (
    <div className="px-8 py-12 md:px-12 animate-pulse max-w-4xl mx-auto space-y-20">
      <div className="space-y-2">
        <div className="h-3 w-32 bg-muted rounded" />
        <div className="h-10 w-48 bg-muted rounded" />
      </div>

      <div className="space-y-6">
        <div className="h-7 w-64 bg-muted rounded" />
        <div className="h-[400px] bg-card border border-border rounded-2xl" />
      </div>

      <div className="space-y-6">
        <div className="h-7 w-64 bg-muted rounded" />
        <div className="h-32 bg-card border border-border rounded-2xl" />
      </div>

      <div className="space-y-6 opacity-40">
        <div className="h-7 w-64 bg-muted rounded" />
        <div className="h-48 bg-card border border-border rounded-2xl" />
      </div>
    </div>
  )
}
