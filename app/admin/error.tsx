"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCcw, Home } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Admin Error Boundary:", error)
  }, [error])

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8 animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 bg-red-400/10 border border-red-400/20 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-red-400/5">
           <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-white text-3xl font-bold tracking-tighter">Something went wrong</h1>
          <p className="text-xs text-[#444] uppercase font-black tracking-widest">Administrative Exception Occurred</p>
        </div>

        <div className="p-4 bg-white/5 border border-[#1f1f1f] rounded-xl">
           <p className="text-xs text-[#888] font-mono italic">"{error.message || "An unexpected system error has interrupted your session."}"</p>
        </div>

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 py-4 bg-white text-black text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-zinc-200 transition-all shadow-xl"
          >
            <RefreshCcw className="w-4 h-4" />
            Attempt Recovery
          </button>
          
          <a
            href="/admin/dashboard"
            className="flex items-center justify-center gap-2 py-4 border border-[#1f1f1f] text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-xl hover:bg-white/5 transition-all"
          >
            <Home className="w-4 h-4" />
            Back to Dashboard
          </a>
        </div>

        <div className="pt-8 opacity-20 text-[10px] text-[#444] uppercase font-bold tracking-widest">
           VendoFlow Admin Console v1.0
        </div>
      </div>
    </div>
  )
}
