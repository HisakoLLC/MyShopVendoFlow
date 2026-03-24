export default function WhatsAppLoading() {
  return (
    <div className="h-[calc(100vh-48px)] flex animate-pulse overflow-hidden bg-[#0a0a0a]">
      {/* Sidebar */}
      <div className="w-80 border-r border-[#1a1a1a] flex flex-col">
        <div className="p-4 border-b border-[#1a1a1a] space-y-4">
          <div className="h-9 w-full bg-[#1a1a1a] rounded" />
          <div className="flex gap-2">
            <div className="h-6 flex-1 bg-[#1a1a1a] rounded" />
            <div className="h-6 flex-1 bg-[#1a1a1a] rounded" />
          </div>
        </div>
        <div className="flex-1 space-y-4 p-4 grayscale opacity-20">
          {[...Array(8)].map((_, i) => (
             <div key={i} className="h-16 w-full bg-[#1a1a1a] rounded" />
          ))}
        </div>
      </div>

      {/* Main View */}
      <div className="flex-1 flex flex-col h-full bg-[#0d0d0d]">
        <div className="h-14 border-b border-[#1a1a1a] flex items-center justify-between px-6">
           <div className="h-6 w-48 bg-[#1a1a1a] rounded" />
           <div className="h-8 w-24 bg-[#1a1a1a] rounded" />
        </div>
        <div className="flex-1 p-6 space-y-6 flex flex-col justify-end">
           <div className="h-20 w-3/4 bg-[#1a1a1a] rounded-xl self-start" />
           <div className="h-12 w-1/2 bg-[#1a1a1a] rounded-xl self-end" />
           <div className="h-16 w-1/3 bg-[#1a1a1a] rounded-xl self-start" />
           <div className="h-24 w-2/3 bg-[#1a1a1a] rounded-xl self-end" />
        </div>
        <div className="h-20 border-t border-[#1a1a1a] m-6 bg-[#111] rounded-xl border border-dashed border-[#1f1f1f]" />
      </div>
    </div>
  )
}
