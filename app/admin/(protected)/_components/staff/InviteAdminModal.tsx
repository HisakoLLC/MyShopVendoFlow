"use client"

import { useState } from "react"
import { X, Shield, Mail, Check, Loader2, UserPlus, CheckCircle2 } from "lucide-react"
import { adminToast } from "@/lib/admin/toast"

interface InviteAdminModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function InviteAdminModal({ onClose, onSuccess }: InviteAdminModalProps) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    role: "support"
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDone, setIsDone] = useState(false)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.email || !formData.fullName) return
    setIsSubmitting(true)
    const toastId = adminToast.loading("Provisioning credentials...")
    try {
      const res = await fetch("/api/admin/staff/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, full_name: formData.fullName, role: formData.role })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to invite")
      }
      adminToast.success(`Invitation sent to ${formData.fullName}`)
      onSuccess()
      onClose()
    } catch (err: any) {
      console.error(err)
      adminToast.error(err.message || "Failed to provision system user")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center px-6 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <h2 className="text-foreground font-bold tracking-tight">Invite System Admin</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isDone ? (
          <div className="p-12 text-center space-y-4 animate-in fade-in zoom-in duration-500">
             <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
             </div>
             <h3 className="text-foreground text-xl font-bold tracking-tight">Invitation Sent</h3>
             <p className="text-sm text-muted-foreground">A magic link has been sent to <span className="text-foreground font-medium">{formData.email}</span>.</p>
          </div>
        ) : (
          <form onSubmit={handleInvite} className="p-6 space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Full Name</label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="text" 
                  required
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-background border border-input rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Login Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input 
                  type="email" 
                  required
                  placeholder="admin@vendoflow.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-background border border-input rounded-xl pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">System role</label>
              <select 
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full bg-background border border-input rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-primary appearance-none"
              >
                <option value="support">Support</option>
                <option value="finance">Finance</option>
                <option value="reporting">Reporting</option>
                <option value="super_admin">Super Admin</option>
              </select>
              <p className="text-[9px] text-muted-foreground italic">Permissions are strictly enforced based on system roles.</p>
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={isSubmitting || !formData.email || !formData.fullName}
                className="w-full py-4 bg-primary text-primary-foreground rounded-xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-primary/90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send System Invitation"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
