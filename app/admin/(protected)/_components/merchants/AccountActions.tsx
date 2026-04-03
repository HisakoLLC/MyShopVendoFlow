"use client"

import { useState } from "react"
import { 
  Key, 
  ShieldAlert, 
  ShieldCheck, 
  StickyNote, 
  MessageCircle, 
  Loader2, 
  Save, 
  X
} from "lucide-react"
import { adminToast } from "@/lib/admin/toast"
import { SuspendAccountModal } from "./billing"
import Link from "next/link"

interface AccountActionsProps {
  accountId: string
  merchantId: string
  merchantName: string
  ownerEmail: string
  subscriptionStatus: string
  userRole: string
  onRefresh: () => void
}

export default function AccountActions({
  accountId,
  merchantId,
  merchantName,
  ownerEmail,
  subscriptionStatus,
  userRole,
  onRefresh
}: AccountActionsProps) {
  const [isResetting, setIsResetting] = useState(false)
  const [showSuspendModal, setShowSuspendModal] = useState(false)
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [noteContent, setNoteContent] = useState("")
  const [isSavingNote, setIsSavingNote] = useState(false)

  const isSuperAdmin = userRole === "super_admin"
  const isSuspended = subscriptionStatus === "suspended"

  const handleResetPassword = async () => {
    if (!window.confirm(`Are you sure you want to trigger a password reset for ${ownerEmail}?`)) return
    
    setIsResetting(true)
    const toastId = adminToast.loading("Triggering password reset...")

    try {
      const res = await fetch("/api/admin/accounts/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId })
      })

      if (!res.ok) throw new Error("Reset failed")
      
      adminToast.success(`Reset email sent to ${ownerEmail.toLowerCase()}`)
    } catch (err: any) {
      adminToast.error("Protocol failure: Reset sequence aborted")
    } finally {
      adminToast.dismiss(toastId)
      setIsResetting(false)
    }
  }

  const handleSaveNote = async () => {
    if (!noteContent.trim()) return
    setIsSavingNote(true)
    const toastId = adminToast.loading("Archiving administrative trace...")

    try {
      const res = await fetch(`/api/admin/accounts/${accountId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteContent })
      })

      if (!res.ok) throw new Error("Failed to save note")

      adminToast.success("Trace successfully archived")
      setNoteContent("")
      setShowNoteInput(false)
      onRefresh()
    } catch (err: any) {
      adminToast.error("Buffer error: Failed to persist note")
    } finally {
      adminToast.dismiss(toastId)
      setIsSavingNote(false)
    }
  }

  return (
    <div className="space-y-6 pt-8 border-t border-[#1a1a1a] mt-8">
      <div className="flex items-center gap-2 text-[#444] text-[10px] font-black uppercase tracking-[0.3em]">
        <ShieldCheck className="w-3 h-3" />
        Account Controls
      </div>

      <div className="grid grid-cols-1 gap-1">
        {/* Reset Password */}
        {isSuperAdmin && (
          <button
            onClick={handleResetPassword}
            disabled={isResetting}
            className="flex items-center justify-between w-full px-4 py-3 bg-[#0d0d0d] border border-[#1a1a1a] hover:border-[#333] transition-all group"
          >
            <div className="flex items-center gap-3">
              {isResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#22c55e]" /> : <Key className="w-3.5 h-3.5 text-[#444] group-hover:text-white transition-colors" />}
              <span className="text-[10px] font-black uppercase tracking-widest text-[#666] group-hover:text-white">Reset Owner Password</span>
            </div>
            <span className="text-[8px] font-bold text-[#222] group-hover:text-[#444] transition-colors">PRTC_091</span>
          </button>
        )}

        {/* Suspend / Reactivate */}
        {isSuperAdmin && (
          <button
            onClick={() => setShowSuspendModal(true)}
            className={`flex items-center justify-between w-full px-4 py-3 bg-[#0d0d0d] border transition-all group ${
              isSuspended 
                ? "border-emerald-500/20 hover:border-emerald-500/40" 
                : "border-red-500/20 hover:border-red-500/40"
            }`}
          >
            <div className="flex items-center gap-3">
              {isSuspended ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
              )}
              <span className={`text-[10px] font-black uppercase tracking-widest ${
                isSuspended ? "text-emerald-500" : "text-red-500"
              }`}>
                {isSuspended ? "Reactivate Account" : "Suspend Account"}
              </span>
            </div>
            <span className="text-[8px] font-bold opacity-20 group-hover:opacity-100 transition-opacity">AUTH_LVL_4</span>
          </button>
        )}

        {/* Add Note */}
        <div className="space-y-1">
          <button
            onClick={() => setShowNoteInput(!showNoteInput)}
            className={`flex items-center justify-between w-full px-4 py-3 bg-[#0d0d0d] border transition-all group ${
              showNoteInput ? "border-[#333] bg-[#111]" : "border-[#1a1a1a] hover:border-[#333]"
            }`}
          >
            <div className="flex items-center gap-3">
              <StickyNote className={`w-3.5 h-3.5 ${showNoteInput ? "text-blue-400" : "text-[#444] group-hover:text-white"}`} />
              <span className={`text-[10px] font-black uppercase tracking-widest ${
                showNoteInput ? "text-white" : "text-[#666] group-hover:text-white"
              }`}>
                Add Admin Note
              </span>
            </div>
            <StickyNote className="w-3 h-3 opacity-10" />
          </button>

          {showNoteInput && (
            <div className="p-4 bg-[#0d0d0d] border-x border-b border-[#1a1a1a] space-y-4 animate-in slide-in-from-top-2 duration-300">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Log internal administrative trace..."
                className="w-full h-32 bg-black border border-[#1a1a1a] p-4 text-[11px] text-white focus:outline-none focus:border-[#333] resize-none font-mono"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveNote}
                  disabled={isSavingNote || !noteContent.trim()}
                  className="flex-1 h-10 flex items-center justify-center gap-2 bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#ccc] disabled:opacity-50 transition-all"
                >
                  {isSavingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Commit Trace
                </button>
                <button
                  onClick={() => {
                    setShowNoteInput(false)
                    setNoteContent("")
                  }}
                  className="px-4 py-3 bg-[#111] border border-[#1a1a1a] text-[#444] hover:text-white transition-all uppercase text-[8px] font-black tracking-widest"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Open WhatsApp */}
        <Link
          href={`/admin/whatsapp?merchant=${merchantId}`}
          className="flex items-center justify-between w-full px-4 py-3 bg-[#0d0d0d] border border-[#1a1a1a] hover:border-[#333] transition-all group"
        >
          <div className="flex items-center gap-3">
            <MessageCircle className="w-3.5 h-3.5 text-[#444] group-hover:text-[#22c55e] transition-colors" />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#666] group-hover:text-white">Secure WhatsApp Link</span>
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
        </Link>
      </div>

      {showSuspendModal && (
        <SuspendAccountModal
          accountId={accountId}
          merchantName={merchantName}
          currentStatus={subscriptionStatus}
          onClose={() => setShowSuspendModal(false)}
          onSuccess={() => {
            setShowSuspendModal(false)
            onRefresh()
          }}
        />
      )}
    </div>
  )
}
