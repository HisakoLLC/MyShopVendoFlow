export default function SettingsLoading() {
  return (
    <div className="px-8 py-12 md:px-12 animate-pulse max-w-4xl mx-auto space-y-20">
      <div className="space-y-2">
        <div className="h-3 w-32 bg-[#1a1a1a] rounded" />
        <div className="h-10 w-48 bg-[#1a1a1a] rounded" />
      </div>

      <div className="space-y-6">
        <div className="h-7 w-64 bg-[#1a1a1a] rounded" />
        <div className="h-[400px] bg-[#111] border border-[#1f1f1f] rounded-2xl" />
      </div>

      <div className="space-y-6">
        <div className="h-7 w-64 bg-[#1a1a1a] rounded" />
        <div className="h-32 bg-[#111] border border-[#1f1f1f] rounded-2xl" />
      </div>

      <div className="space-y-6 opacity-40">
        <div className="h-7 w-64 bg-[#1a1a1a] rounded" />
        <div className="h-48 bg-[#111] border border-[#1f1f1f] rounded-2xl" />
      </div>
    </div>
  )
}
