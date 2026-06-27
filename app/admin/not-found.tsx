import Link from 'next/link'

export default function AdminNotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center font-sans">
        {/* VendoFlow wordmark */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="font-bold text-lg tracking-tight">VendoFlow</span>
          <span className="text-[10px] font-semibold tracking-widest uppercase px-1.5 py-0.5 rounded-md bg-[#E8400C]/10 text-[#E8400C]">Admin</span>
        </div>
        
        {/* 404 number */}
        <div className="text-[120px] font-bold text-muted/30 leading-none mb-4 select-none font-mono">
          404
        </div>
        
        {/* Message */}
        <p className="text-foreground text-sm font-semibold mb-2">Page not found</p>
        <p className="text-muted-foreground text-xs mb-8 max-w-xs mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        {/* Return button */}
        <Link 
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 bg-[#E8400C] text-white text-xs font-semibold tracking-wide uppercase px-5 py-2.5 rounded-md hover:bg-[#c73508] transition-colors shadow-sm"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  )
}
