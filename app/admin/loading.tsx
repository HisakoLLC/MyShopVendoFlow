export default function AdminLoading() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="flex items-center gap-3">
        <div className="w-4 h-4 rounded-full bg-[#22c55e] animate-pulse" />
        <span className="text-[#666] text-xs tracking-widest uppercase font-bold">Loading</span>
      </div>
    </div>
  )
}
