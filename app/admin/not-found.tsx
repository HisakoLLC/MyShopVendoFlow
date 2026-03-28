import Link from 'next/link'

export default function AdminNotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        {/* VendoFlow wordmark */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="text-white font-bold text-lg">VendoFlow</span>
          <span className="text-[10px] font-semibold tracking-widest uppercase px-1.5 py-0.5 rounded bg-[#22c55e]/10 text-[#22c55e]">Admin</span>
        </div>
        
        {/* 404 number */}
        <div className="text-[120px] font-bold text-[#1a1a1a] leading-none mb-4 select-none">
          404
        </div>
        
        {/* Message */}
        <p className="text-white text-sm font-semibold mb-2">Page not found</p>
        <p className="text-[#666] text-xs mb-8 max-w-xs mx-auto">
          The page you're looking for doesn't exist or has been moved.
        </p>
        
        {/* Return button */}
        <Link 
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 bg-white text-[#0a0a0a] text-xs font-semibold tracking-[0.12em] uppercase px-5 py-2.5 rounded-sm hover:bg-zinc-100 transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  )
}
