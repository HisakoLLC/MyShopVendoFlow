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
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Sheet Content */}
      <div className="relative w-full max-w-md bg-[#0a0a0a] border-l border-[#1f1f1f] h-full shadow-2xl animate-in slide-in-from-right duration-500 flex flex-col">
        {/* Header */}
        <div className="px-6 py-6 border-b border-[#1f1f1f] flex items-center justify-between bg-[#0d0d0d]">
          <div>
            <h2 className="text-white text-lg font-bold tracking-tight">Edit Merchant</h2>
            <p className="text-[10px] text-[#444] font-black uppercase tracking-widest mt-0.5">Profile Modification Protocol</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/5 text-[#444] hover:text-white transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
          {/* Business Details */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#22c55e]">Business Identity</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#444] uppercase font-black">Business Legal Name</label>
                <input
                  type="text"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  className="w-full bg-[#111] border border-[#1f1f1f] rounded p-3 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-all font-medium"
                />
              </div>
            </div>
          </section>

          {/* Contact Details */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#22c55e]">Contact Architecture</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#444] uppercase font-black">Owner Email</label>
                {isSuperAdmin ? (
                  <>
                    <input
                      type="email"
                      value={formData.owner_email}
                      onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                      className="w-full bg-[#111] border border-[#1f1f1f] rounded p-3 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-all font-medium"
                    />
                    <div className="flex items-start gap-2 p-3 rounded bg-amber-500/5 border border-amber-500/10">
                      <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-[9px] text-amber-500/80 leading-relaxed font-bold uppercase tracking-tight">
                        Critical: Changing email updates login credentials for this merchant.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <div className="w-full bg-[#0d0d0d] border border-[#1f1f1f] rounded p-3 text-sm text-[#444] font-medium italic">
                      {formData.owner_email}
                    </div>
                    <p className="text-[9px] text-[#333] font-black uppercase tracking-tighter">
                      Contact super admin to change identity email
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-[#444] uppercase font-black">Owner Primary Phone</label>
                <input
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+254..."
                  className="w-full bg-[#111] border border-[#1f1f1f] rounded p-3 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-all font-medium"
                />
              </div>
            </div>
          </section>

          {/* Location */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#22c55e]">Geographic Node</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#444] uppercase font-black">City</label>
                <input
                  type="text"
                  value={formData.city || ""}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Nairobi"
                  className="w-full bg-[#111] border border-[#1f1f1f] rounded p-3 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-all font-medium"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#444] uppercase font-black">Country</label>
                <input
                  type="text"
                  value={formData.country || ""}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Kenya"
                  className="w-full bg-[#111] border border-[#1f1f1f] rounded p-3 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-all font-medium"
                />
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#1f1f1f] bg-[#0d0d0d] flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded border border-[#1f1f1f] text-white text-[11px] font-black uppercase tracking-widest hover:bg-white/5 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2.5 bg-[#22c55e] text-black rounded text-[11px] font-black uppercase tracking-widest hover:bg-[#1eb054] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Commit Changes
          </button>
        </div>
      </div>
    </div>
  )
}
