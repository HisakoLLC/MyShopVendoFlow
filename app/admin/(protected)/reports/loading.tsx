export default function ReportsLoading() {
  return (
    <div className="px-8 py-8 md:px-12 max-w-7xl mx-auto animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div className="space-y-2">
          <div className="h-3 w-32 bg-[#1a1a1a] rounded" />
          <div className="h-8 w-48 bg-[#1a1a1a] rounded" />
        </div>
        <div className="h-10 w-40 bg-[#1a1a1a] rounded" />
      </div>

      {/* Filter Bar */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-lg p-4 mb-8 space-y-4">
        <div className="flex gap-4">
           {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 w-20 bg-[#1a1a1a] rounded" />
          ))}
        </div>
        <div className="grid grid-cols-4 gap-4">
           {[...Array(4)].map((_, i) => (
            <div key={i} className="h-9 bg-[#1a1a1a] rounded" />
          ))}
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-lg overflow-hidden">
        <div className="h-12 bg-[#1a1a1a] border-b border-[#1f1f1f]" />
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-16 border-b border-[#1f1f1f] flex items-center px-6 gap-8">
            <div className="w-24 h-4 bg-[#1a1a1a] rounded" />
            <div className="flex-1 h-4 bg-[#1a1a1a] rounded" />
            <div className="w-32 h-4 bg-[#1a1a1a] rounded" />
            <div className="w-20 h-6 bg-[#1a1a1a] rounded-full" />
            <div className="w-24 h-4 bg-[#1a1a1a] rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
