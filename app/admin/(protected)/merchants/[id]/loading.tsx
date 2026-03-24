export default function MerchantDetailLoading() {
  return (
    <div className="px-8 py-8 animate-pulse max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-[#1a1a1a] rounded" />
          <div className="h-10 w-64 bg-[#1a1a1a] rounded" />
        </div>
        <div className="h-10 w-40 bg-[#1a1a1a] rounded" />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-6">
          <div className="h-[400px] bg-[#111] border border-[#1f1f1f] rounded-lg p-6 space-y-4">
             <div className="h-6 w-full bg-[#1a1a1a] rounded" />
             <div className="h-4 w-1/2 bg-[#1a1a1a] rounded" />
             <div className="pt-4 space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 bg-[#1a1a1a] rounded mt-2" />
                ))}
             </div>
          </div>
        </div>
        <div className="col-span-2 space-y-6">
           <div className="flex gap-4 border-b border-[#1f1f1f] pb-1">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-8 w-24 bg-[#1a1a1a] rounded" />
              ))}
           </div>
           <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-24 bg-[#111] border border-[#1f1f1f] rounded-lg" />
              ))}
           </div>
           <div className="h-[300px] bg-[#111] border border-[#1f1f1f] rounded-lg" />
        </div>
      </div>
    </div>
  )
}
