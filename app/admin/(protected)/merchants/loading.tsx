export default function MerchantsLoading() {
  return (
    <div className="px-8 py-8 animate-pulse max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <div className="h-3 w-32 bg-[#1a1a1a] rounded" />
          <div className="h-8 w-48 bg-[#1a1a1a] rounded" />
        </div>
        <div className="h-4 w-20 bg-[#1a1a1a] rounded" />
      </div>

      <div className="bg-[#111] border border-[#1f1f1f] rounded-lg p-4 flex gap-4">
        <div className="h-10 flex-1 bg-[#1a1a1a] rounded" />
        <div className="h-10 w-32 bg-[#1a1a1a] rounded" />
      </div>

      <div className="bg-[#111] border border-[#1f1f1f] rounded-lg overflow-hidden">
        <div className="h-12 bg-[#1a1a1a] border-b border-[#1f1f1f]" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-20 border-b border-[#1f1f1f] flex items-center px-6 gap-8">
            <div className="flex-1 h-5 bg-[#1a1a1a] rounded" />
            <div className="w-48 h-5 bg-[#1a1a1a] rounded" />
            <div className="w-24 h-5 bg-[#1a1a1a] rounded" />
            <div className="w-32 h-5 bg-[#1a1a1a] rounded" />
            <div className="w-24 h-5 bg-[#1a1a1a] rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
