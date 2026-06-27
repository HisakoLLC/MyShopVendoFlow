export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 rounded-full bg-[#E8400C] animate-pulse" />
        <span className="text-muted-foreground text-xs tracking-widest uppercase font-semibold font-sans">Loading</span>
      </div>
    </div>
  )
}
