"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, LogOut, Phone, Mail } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"

export default function SuspendedPage() {
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6 select-none relative overflow-hidden">
      {/* Editorial Watermark (Monochrome) */}
      <div className="absolute top-10 left-10 opacity-[0.03] pointer-events-none">
        <h1 className="font-editorial text-[12vw] leading-none text-white uppercase font-black">
          Suspended
        </h1>
      </div>

      <div className="max-w-xl w-full space-y-12 relative z-10 text-center lg:text-left">
        {/* Header Section */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest animate-pulse">
            <AlertCircle className="w-3 h-3" />
            Account Suspended
          </div>
          
          <h2 className="font-editorial text-5xl md:text-7xl font-bold text-white leading-tight">
            Service has been <span className="italic opacity-50 underline decoration-1 underline-offset-8">paused</span>.
          </h2>
          
          <p className="text-sm md:text-base text-zinc-500 font-medium leading-relaxed max-w-md">
            Your VendoFlow account is currently suspended due to a billing issue or an administrative policy. All operations, including POS and Dashboard access, are restricted.
          </p>
        </div>

        {/* Action / Contact Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-md border border-zinc-900 bg-zinc-900/50 space-y-4 text-left group hover:border-zinc-700 transition-colors">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-white group-hover:text-black transition-all">
              <Phone className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-1">Immediate Assistance</p>
              <p className="text-sm text-zinc-300 font-bold">+254 700 000 000</p>
            </div>
          </div>

          <div className="p-6 rounded-md border border-zinc-900 bg-zinc-900/50 space-y-4 text-left group hover:border-zinc-700 transition-colors">
            <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:bg-white group-hover:text-black transition-all">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 mb-1">Billing Support</p>
              <p className="text-sm text-zinc-300 font-bold">support@vendoflow.com</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-8 border-t border-zinc-900 flex flex-col md:flex-row items-center gap-6">
          <Button
            onClick={() => window.location.reload()}
            className="w-full md:w-auto bg-white text-black hover:bg-zinc-200 rounded-sm px-8 py-6 text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95"
          >
            Check Status Again
          </Button>
          
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-zinc-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors group"
          >
            <LogOut className="w-3 h-3 group-hover:-translate-x-1 transition-transform" />
            Sign Out of Account
          </button>
        </div>

        {/* Copyright / Branding */}
        <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-[0.3em] pt-12">
          &copy; 2026 VendoFlow Editorial Systems. All Rights Reserved.
        </p>
      </div>
      
      {/* Geometric Accents */}
      <div className="absolute bottom-0 right-0 p-12 opacity-10 pointer-events-none">
        <div className="w-32 h-32 border border-white rounded-full translate-x-1/2 translate-y-1/2" />
      </div>
    </div>
  )
}
