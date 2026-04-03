"use client"

import { useState, useEffect } from "react"
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle,
  SheetDescription
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { adminToast } from "@/lib/admin/toast"
import { Loader2 } from "lucide-react"

interface EditMerchantSheetProps {
  accountId: string
  initialData: any
  userRole: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function EditMerchantSheet({
  accountId,
  initialData,
  isOpen,
  onClose,
  onSuccess
}: EditMerchantSheetProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState(initialData)

  useEffect(() => {
    setFormData(initialData)
  }, [initialData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const toastId = adminToast.loading("Synchronizing protocol...")

    try {
      const res = await fetch(`/api/admin/accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      if (!res.ok) throw new Error("Protocol failure")

      adminToast.success("Merchant parameters updated")
      onSuccess()
    } catch (err) {
      adminToast.error("Failed to commit changes")
    } finally {
      adminToast.dismiss(toastId)
      setLoading(false)
    }
  }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="bg-[#0a0a0a] border-l border-[#1a1a1a] sm:max-w-md p-0">
        <div className="h-full flex flex-col">
          <SheetHeader className="p-8 border-b border-[#1a1a1a] bg-[#0d0d0d]">
            <SheetTitle className="text-white text-xl font-black uppercase tracking-widest">Protocol Override</SheetTitle>
            <SheetDescription className="text-[#444] text-[10px] font-bold uppercase tracking-[0.2em]">Adjusting merchant parameters</SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
            <div className="space-y-4">
               <div>
                 <Label className="text-[10px] font-black text-[#444] uppercase tracking-widest mb-1.5 block">Business Identity</Label>
                 <Input 
                   value={formData.business_name || ""} 
                   onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                   className="bg-black border-[#1a1a1a] text-white text-sm rounded-sm h-12"
                 />
               </div>
               <div>
                 <Label className="text-[10px] font-black text-[#444] uppercase tracking-widest mb-1.5 block">Owner Vector</Label>
                 <Input 
                   value={formData.owner_email || ""} 
                   onChange={(e) => setFormData({...formData, owner_email: e.target.value})}
                   className="bg-black border-[#1a1a1a] text-white text-sm rounded-sm h-12"
                 />
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-[10px] font-black text-[#444] uppercase tracking-widest mb-1.5 block">Region</Label>
                    <Input 
                      value={formData.city || ""} 
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="bg-black border-[#1a1a1a] text-white text-sm rounded-sm h-12"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-black text-[#444] uppercase tracking-widest mb-1.5 block">ISO Code</Label>
                    <Input 
                      value={formData.country || ""} 
                      onChange={(e) => setFormData({...formData, country: e.target.value})}
                      className="bg-black border-[#1a1a1a] text-white text-sm rounded-sm h-12"
                    />
                  </div>
               </div>
            </div>
          </form>

          <div className="p-8 bg-[#0d0d0d] border-t border-[#1a1a1a] flex gap-4">
             <Button 
               variant="outline" 
               className="flex-1 rounded-sm border-[#1a1a1a] text-[#444] hover:text-white"
               onClick={onClose}
             >
               Abort
             </Button>
             <Button 
               className="flex-1 rounded-sm bg-white text-black font-black uppercase tracking-widest hover:bg-[#ccc]"
               onClick={handleSubmit}
               disabled={loading}
             >
               {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Commit"}
             </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
