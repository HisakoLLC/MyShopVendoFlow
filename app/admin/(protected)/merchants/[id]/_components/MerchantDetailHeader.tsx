"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  ChevronLeft, 
  Calendar, 
  Pencil,
  MessageSquare,
  MoreVertical
} from "lucide-react"
import EditMerchantSheet from "./EditMerchantSheet"

interface MerchantDetailHeaderProps {
  account: any
  userRole: string
}

export default function MerchantDetailHeader({ account, userRole }: MerchantDetailHeaderProps) {
  const [showEditSheet, setShowEditSheet] = useState(false)
  const router = useRouter()

  return (
    <div className="mb-6 font-sans">
      <Link 
        href="/admin/merchants" 
        className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground text-xs font-semibold uppercase tracking-wider transition-colors mb-4 group"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to Merchants
      </Link>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <h1 className="text-foreground text-3xl font-bold tracking-tight">{account.business_name}</h1>
            <button 
              onClick={() => setShowEditSheet(true)}
              className="p-1.5 rounded-md bg-accent border border-border text-muted-foreground hover:text-[#E8400C] hover:border-[#E8400C]/30 transition-all group/edit cursor-pointer"
              title="Edit Profile"
            >
              <Pencil className="w-4 h-4 group-hover/edit:scale-110 transition-transform" />
            </button>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground text-xs font-medium">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Joined {new Date(account.created_at).toLocaleDateString()}
            </span>
            <span>•</span>
            <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
              account.subscription_status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
              account.subscription_status === 'suspended' ? 'bg-destructive/10 text-destructive border-destructive/20' :
              'bg-muted text-muted-foreground border-border'
            }`}>
              {account.subscription_status}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Link 
            href={`/admin/whatsapp?merchant=${account.account_id}`}
            className="px-4 py-2 rounded-md border border-border bg-card text-foreground text-xs font-semibold uppercase tracking-wider hover:border-foreground/40 transition-all flex items-center gap-2 shadow-sm"
          >
            <MessageSquare className="w-4 h-4 text-[#E8400C]" />
            Send WhatsApp
          </Link>
          <button className="p-2 border border-border rounded-md hover:bg-accent transition-all text-muted-foreground hover:text-foreground cursor-pointer">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      <EditMerchantSheet
        accountId={account.account_id}
        initialData={{
          business_name: account.business_name,
          owner_email: account.owner_email,
          phone: account.phone,
          city: account.city,
          country: account.country
        }}
        userRole={userRole}
        isOpen={showEditSheet}
        onClose={() => setShowEditSheet(false)}
        onSuccess={() => {
          setShowEditSheet(false)
          router.refresh()
        }}
      />
    </div>
  )
}
