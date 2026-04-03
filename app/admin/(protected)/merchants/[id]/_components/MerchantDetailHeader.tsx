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
    <div className="mb-6">
      <Link 
        href="/admin/merchants" 
        className="inline-flex items-center gap-1 text-[#444] hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors mb-4 group"
      >
        <ChevronLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" />
        Back to Merchants
      </Link>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-4">
            <h1 className="text-white text-3xl font-bold tracking-tight">{account.business_name}</h1>
            <button 
              onClick={() => setShowEditSheet(true)}
              className="p-1.5 rounded bg-white/5 border border-white/5 text-[#444] hover:text-[#22c55e] hover:border-[#22c55e]/20 transition-all group/edit"
              title="Edit Profile"
            >
              <Pencil className="w-3.5 h-3.5 group-hover/edit:scale-110 transition-transform" />
            </button>
          </div>
          <div className="flex items-center gap-3 text-[#666] text-xs">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Joined {new Date(account.created_at).toLocaleDateString()}
            </span>
            <span>•</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${
              account.subscription_status === 'active' ? 'bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20' :
              account.subscription_status === 'suspended' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
              'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
            }`}>
              {account.subscription_status}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Link 
            href={`/admin/whatsapp?merchant=${account.account_id}`}
            className="px-4 py-2 rounded border border-[#1f1f1f] bg-[#111] text-white text-[10px] font-bold uppercase tracking-widest hover:border-[#22c55e]/20 transition-all flex items-center gap-2"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#22c55e]" />
            Send WhatsApp
          </Link>
          <button className="p-2 border border-[#1f1f1f] rounded hover:bg-white/5 transition-all text-[#444] hover:text-white">
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
