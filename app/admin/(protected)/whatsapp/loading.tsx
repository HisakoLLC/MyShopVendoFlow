export default function WhatsAppLoading() {
  return (
    <div className="h-[calc(100vh-48px)] flex animate-pulse overflow-hidden bg-background">
      {/* Sidebar */}
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border space-y-4">
          <div className="h-9 w-full bg-muted rounded" />
          <div className="flex gap-2">
            <div className="h-6 flex-1 bg-muted rounded" />
            <div className="h-6 flex-1 bg-muted rounded" />
          </div>
        </div>
        <div className="flex-1 space-y-4 p-4 opacity-40">
          {[...Array(8)].map((_, i) => (
             <div key={i} className="h-16 w-full bg-muted rounded" />
          ))}
        </div>
      </div>

      {/* Main View */}
      <div className="flex-1 flex flex-col h-full bg-muted/10">
        <div className="h-14 border-b border-border flex items-center justify-between px-6">
           <div className="h-6 w-48 bg-muted rounded" />
           <div className="h-8 w-24 bg-muted rounded" />
        </div>
        <div className="flex-1 p-6 space-y-6 flex flex-col justify-end">
           <div className="h-20 w-3/4 bg-muted rounded-xl self-start" />
           <div className="h-12 w-1/2 bg-muted rounded-xl self-end" />
           <div className="h-16 w-1/3 bg-muted rounded-xl self-start" />
           <div className="h-24 w-2/3 bg-muted rounded-xl self-end" />
        </div>
        <div className="h-20 border-t border-border m-6 bg-muted rounded-xl border-dashed" />
      </div>
    </div>
  )
}
