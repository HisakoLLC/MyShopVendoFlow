'use client'
import { useEffect } from 'react'
import Link from 'next/link'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Admin error:', error)
  }, [error])

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
      <div className="text-center max-w-sm">
        {/* VendoFlow wordmark */}
        <div className="flex items-center justify-center gap-2 mb-8 font-sans">
          <span className="font-bold text-lg tracking-tight">VendoFlow</span>
          <span className="text-[10px] font-semibold tracking-widest uppercase px-1.5 py-0.5 rounded-md bg-[#E8400C]/10 text-[#E8400C]">Admin</span>
        </div>
        
        <div className="w-12 h-12 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-destructive text-xl font-bold">!</span>
        </div>
        
        <p className="text-foreground text-sm font-semibold mb-2 font-sans">Something went wrong</p>
        <p className="text-muted-foreground text-xs mb-6 leading-relaxed font-sans">
          An unexpected error occurred. This has been logged.
          {error.digest && <span className="block mt-1 font-mono text-muted-foreground/70">ID: {error.digest}</span>}
        </p>
        
        <div className="flex gap-3 justify-center font-sans">
          <button
            onClick={reset}
            className="text-xs font-semibold tracking-wide uppercase px-4 py-2 rounded-md bg-[#E8400C] text-white hover:bg-[#c73508] transition-colors shadow-sm"
          >
            Try again
          </button>
          <Link
            href="/admin/dashboard"
            className="text-xs font-semibold tracking-wide uppercase px-4 py-2 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
