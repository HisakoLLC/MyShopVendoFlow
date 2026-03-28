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
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center max-w-sm">
        {/* VendoFlow wordmark */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <span className="text-white font-bold text-lg">VendoFlow</span>
          <span className="text-[10px] font-semibold tracking-widest uppercase px-1.5 py-0.5 rounded bg-[#22c55e]/10 text-[#22c55e]">Admin</span>
        </div>
        
        <div className="w-12 h-12 rounded-sm bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <span className="text-red-400 text-xl font-bold">!</span>
        </div>
        
        <p className="text-white text-sm font-semibold mb-2">Something went wrong</p>
        <p className="text-[#666] text-xs mb-6 leading-relaxed">
          An unexpected error occurred. This has been logged.
          {error.digest && <span className="block mt-1 font-mono text-[#444]">ID: {error.digest}</span>}
        </p>
        
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="text-xs font-semibold tracking-[0.12em] uppercase px-4 py-2 rounded-sm bg-white text-[#0a0a0a] hover:bg-zinc-100 transition-colors"
          >
            Try again
          </button>
          <Link
            href="/admin/dashboard"
            className="text-xs font-semibold tracking-[0.12em] uppercase px-4 py-2 rounded-sm border border-[#2a2a2a] text-[#888] hover:text-white hover:border-[#444] transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
