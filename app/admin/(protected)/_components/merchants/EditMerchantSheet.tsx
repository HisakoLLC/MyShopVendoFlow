"use client"

import { useState, useEffect } from "react"
import { X, Loader2, Save, AlertTriangle } from "lucide-react"
import { adminToast } from "@/lib/admin/toast"

interface EditMerchantSheetProps {
  accountId: string
  initialData: {
    business_name: string
    owner_email: string
    phone?: string
    city?: string
    country?: string
  }
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  userRole: string
}

export default function EditMerchantSheet({
  accountId,
  initialData,
  isOpen,
  onClose,
  onSuccess,
  userRole
}: EditMerchantSheetProps) {
  const [formData, setFormData] = useState(initialData)
  const [isSaving, setIsSaving] = useState(false)
  const isSuperAdmin = userRole === "super_admin"

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData)
    }
  }, [isOpen, initialData])

  if (!isOpen) return null

  const handleSave = async () => {
    setIsSaving(true)
    const toastId = adminToast.loading("Updating merchant profile...")

    try {
      const res = await fetch(`/api/admin/accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.business_name,
          email: isSuperAdmin ? formData.owner_email : undefined,
          phone: formData.phone,
          city: formData.city,
          country: formData.country
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Failed to update profile")
      }

      adminToast.success("Profile updated successfully")
      onSuccess()
    } catch (err: any) {
      adminToast.error(err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex justify-end font-sans">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Sheet Content */}
      <div className="relative w-full max-w-md bg-card border-l border-border h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
        {/* Header */}
        <div className="px-6 py-6 border-b border-border flex items-center justify-between bg-muted/40">
          <div>
            <h2 className="text-foreground text-lg font-bold tracking-tight">Edit Merchant</h2>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">Profile Modification Protocol</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {/* Business Details */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#E8400C]">Business Identity</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase font-bold">Business Legal Name</label>
                <input
                  type="text"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  className="w-full bg-background border border-border rounded-md p-3 text-sm text-foreground focus:outline-none focus:border-foreground/40 transition-all font-medium"
                />
              </div>
            </div>
          </section>

          {/* Contact Details */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#E8400C]">Contact Architecture</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase font-bold">Owner Email</label>
                {isSuperAdmin ? (
                  <>
                    <input
                      type="email"
                      value={formData.owner_email}
                      onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                      className="w-full bg-background border border-border rounded-md p-3 text-sm text-foreground focus:outline-none focus:border-foreground/40 transition-all font-medium"
                    />
                    <div className="flex items-start gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-amber-500 leading-relaxed font-semibold">
                        Critical: Changing email updates login credentials for this merchant.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="w-full bg-muted/40 border border-border rounded-md p-3 text-sm text-muted-foreground font-medium italic">
                      {formData.owner_email}
                    </div>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tight">
                      Contact super admin to change identity email
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase font-bold">Owner Primary Phone</label>
                <input
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+254..."
                  className="w-full bg-background border border-border rounded-md p-3 text-sm text-foreground focus:outline-none focus:border-foreground/40 transition-all font-medium"
                />
              </div>
            </div>
          </section>

          {/* Location */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#E8400C]">Geographic Node</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase font-bold">City</label>
                <input
                  type="text"
                  value={formData.city || ""}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Nairobi"
                  className="w-full bg-background border border-border rounded-md p-3 text-sm text-foreground focus:outline-none focus:border-foreground/40 transition-all font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase font-bold">Country</label>
                <input
                  type="text"
                  value={formData.country || ""}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Kenya"
                  className="w-full bg-background border border-border rounded-md p-3 text-sm text-foreground focus:outline-none focus:border-foreground/40 transition-all font-medium"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border bg-muted/40 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-md border border-border text-foreground text-xs font-semibold uppercase tracking-wider hover:bg-accent transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2.5 bg-[#E8400C] text-white rounded-md text-xs font-semibold uppercase tracking-wider hover:bg-[#c73508] transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Commit Changes
          </button>
        </div>
      </div>
    </div>
  )
}
