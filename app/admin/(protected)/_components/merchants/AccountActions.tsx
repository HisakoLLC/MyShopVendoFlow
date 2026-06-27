"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
}

export default function AccountActions({
  accountId,
  merchantId,
  merchantName,
  ownerEmail,
  subscriptionStatus,
  userRole,
}: AccountActionsProps) {
  const router = useRouter()
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
            router.refresh()
    } catch (err: any) {
      adminToast.error("Buffer error: Failed to persist note")
    } finally {
      adminToast.dismiss(toastId)
      setIsSavingNote(false)
    }
  }

  return (
    <div className="space-y-6 pt-8 border-t border-border mt-8 font-sans">
      <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-bold uppercase tracking-wider">
        <ShieldCheck className="w-3.5 h-3.5 text-[#E8400C]" />
        Account Controls
      </div>

      <div className="grid grid-cols-1 gap-2">
        {/* Reset Password */}
        {isSuperAdmin && (
          <button
            onClick={handleResetPassword}
            disabled={isResetting}
            className="flex items-center justify-between w-full px-4 py-3 bg-card border border-border rounded-md hover:border-foreground/40 transition-all group shadow-sm cursor-pointer"
          >
            <div className="flex items-center gap-3">
              {isResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#E8400C]" /> : <Key className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />}
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground">Reset Owner Password</span>
            </div>
            <span className="text-[10px] font-mono font-bold text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">PRTC_091</span>
          </button>
        )}

        {/* Suspend / Reactivate */}
        {isSuperAdmin && (
          <button
            onClick={() => setShowSuspendModal(true)}
            className={`flex items-center justify-between w-full px-4 py-3 bg-card border rounded-md transition-all group shadow-sm cursor-pointer ${
              isSuspended 
                ? "border-emerald-500/20 hover:border-emerald-500/40" 
                : "border-destructive/20 hover:border-destructive/40"
            }`}
          >
            <div className="flex items-center gap-3">
              {isSuspended ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <ShieldAlert className="w-3.5 h-3.5 text-destructive" />
              )}
              <span className={`text-xs font-semibold uppercase tracking-wider ${
                isSuspended ? "text-emerald-500" : "text-destructive"
              }`}>
                {isSuspended ? "Reactivate Account" : "Suspend Account"}
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold opacity-40 group-hover:opacity-100 transition-opacity">AUTH_LVL_4</span>
          </button>
        )}

        {/* Add Note */}
        <div className="space-y-1">
          <button
            onClick={() => setShowNoteInput(!showNoteInput)}
            className={`flex items-center justify-between w-full px-4 py-3 bg-card border rounded-md transition-all group shadow-sm cursor-pointer ${
              showNoteInput ? "border-foreground/40 bg-accent" : "border-border hover:border-foreground/40"
            }`}
          >
            <div className="flex items-center gap-3">
              <StickyNote className={`w-3.5 h-3.5 ${showNoteInput ? "text-[#E8400C]" : "text-muted-foreground group-hover:text-foreground"}`} />
              <span className={`text-xs font-semibold uppercase tracking-wider ${
                showNoteInput ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
              }`}>
                Add Admin Note
              </span>
            </div>
            <StickyNote className="w-3.5 h-3.5 opacity-30" />
          </button>

          {showNoteInput && (
            <div className="p-4 bg-card border border-border rounded-md shadow-sm space-y-4 animate-in slide-in-from-top-2 duration-300">
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Log internal administrative trace..."
                className="w-full h-32 bg-background border border-border rounded-md p-4 text-xs text-foreground focus:outline-none focus:border-foreground/40 resize-none font-sans"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveNote}
                  disabled={isSavingNote || !noteContent.trim()}
                  className="flex-1 h-10 flex items-center justify-center gap-2 bg-[#E8400C] text-white text-xs font-semibold uppercase tracking-wider rounded-md hover:bg-[#c73508] disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                >
                  {isSavingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Commit Trace
                </button>
                <button
                  onClick={() => {
                    setShowNoteInput(false)
                    setNoteContent("")
                  }}
                  className="px-4 py-3 bg-transparent border border-border text-muted-foreground hover:text-foreground rounded-md transition-all uppercase text-[10px] font-semibold tracking-wider cursor-pointer"
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
          className="flex items-center justify-between w-full px-4 py-3 bg-card border border-border rounded-md hover:border-foreground/40 transition-all group shadow-sm"
        >
          <div className="flex items-center gap-3">
            <MessageCircle className="w-3.5 h-3.5 text-muted-foreground group-hover:text-[#E8400C] transition-colors" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground group-hover:text-foreground">Secure WhatsApp Link</span>
          </div>
          <div className="w-2 h-2 rounded-full bg-[#E8400C] animate-pulse" />
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
                  router.refresh()
          }}
        />
      )}
    </div>
  )
}
