export default function StaffLoading() {
  return (
    <div className="px-8 py-8 md:px-12 animate-pulse max-w-7xl mx-auto space-y-10">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <div className="h-3 w-32 bg-[#1a1a1a] rounded" />
          <div className="h-10 w-48 bg-[#1a1a1a] rounded" />
        </div>
        <div className="h-12 w-44 bg-[#1a1a1a] rounded-xl" />
      </div>

      <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl overflow-hidden shadow-2xl">
        <div className="h-16 bg-[#161616] border-b border-[#1f1f1f]" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 border-b border-[#1f1f1f] flex items-center px-8 gap-10">
            <div className="w-10 h-10 rounded-full bg-[#1a1a1a]" />
            <div className="flex-1 space-y-2">
               <div className="h-4 w-40 bg-[#1a1a1a] rounded" />
               <div className="h-3 w-32 bg-[#1a1a1a] rounded opacity-50" />
            </div>
            <div className="w-24 h-5 bg-[#1a1a1a] rounded" />
            <div className="w-32 h-5 bg-[#1a1a1a] rounded" />
            <div className="w-10 h-10 bg-[#1a1a1a] rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
