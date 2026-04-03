"use client"

import { useState, useEffect } from "react"
import { Plus, Send, Eye, Loader2 } from "lucide-react"
import { adminToast } from "@/lib/admin/toast"
import { CreateBroadcastModal } from "./CreateBroadcastModal"
import { LoadingSkeleton } from "@/app/admin/(protected)/_components/ui/LoadingSkeleton"
import { EmptyState } from "@/app/admin/(protected)/_components/ui/EmptyState"

export default function BroadcastsTab() {
  const [broadcasts, setBroadcasts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)

  const fetchBroadcasts = async () => {
    try {
      const res = await fetch("/api/admin/broadcasts")
      const data = await res.json()
      setBroadcasts(data.broadcasts || [])
    } catch (err) {
      adminToast.error("Failed to load broadcasts")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBroadcasts()
  }, [])

  const handleSendNow = async (id: string) => {
    setSendingId(id)
    const toastId = adminToast.loading("Initiating broadcast sequence...")
    try {
      const res = await fetch(`/api/admin/broadcasts/${id}/send`, { method: "POST" })
      if (!res.ok) throw new Error("Send failed")
      adminToast.success("Broadcast sequence completed")
      fetchBroadcasts()
    } catch (err) {
      adminToast.error("Broadcast failed")
    } finally {
      adminToast.dismiss(toastId)
      setSendingId(null)
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "completed": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
      case "sending": return "bg-amber-500/10 text-amber-500 border-amber-500/20"
      case "failed": return "bg-red-500/10 text-red-500 border-red-500/20"
      case "scheduled": return "bg-blue-500/10 text-blue-500 border-blue-500/20"
      default: return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20"
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden">
      <div className="h-16 border-b border-[#1a1a1a] flex items-center px-8 justify-between bg-[#0d0d0d]/30 backdrop-blur-md shrink-0">
        <div className="space-y-0.5">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">Broadcast Control</h2>
          <p className="text-[10px] text-[#444] font-bold uppercase tracking-widest">Mass communication protocols</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#22c55e] text-black rounded-sm text-[10px] font-black uppercase tracking-[0.2em] hover:bg-[#1eb054] transition-all shadow-[0_0_20px_rgba(34,197,94,0.2)]"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Broadcast
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {loading ? (
          <LoadingSkeleton className="h-full w-full" />
        ) : (
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-sm overflow-hidden shadow-2xl min-h-[400px] flex flex-col">
            {broadcasts.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#1a1a1a] bg-[#111]">
                    <th className="px-6 py-4 text-[10px] font-black text-[#444] uppercase tracking-widest">Name</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[#444] uppercase tracking-widest">Template</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[#444] uppercase tracking-widest">Segment</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[#444] uppercase tracking-widest text-center">Stats</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[#444] uppercase tracking-widest text-center">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[#444] uppercase tracking-widest">Created</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[#444] uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1a1a1a]">
                  {broadcasts.map((b) => (
                    <tr key={b.id} className="group hover:bg-[#111] transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-white uppercase">{b.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[10px] font-black text-[#22c55e] uppercase tracking-tight bg-[#22c55e]/5 border border-[#22c55e]/10 px-2 py-0.5 rounded-sm inline-block">{b.template_name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[10px] font-bold text-[#666] uppercase tracking-widest">{b.segment}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-4">
                           <div className="text-center">
                              <div className="text-[10px] font-black text-emerald-500">{b.sent_count}</div>
                              <div className="text-[8px] font-bold text-[#333] uppercase">Sent</div>
                           </div>
                           <div className="text-center">
                              <div className="text-[10px] font-black text-red-500">{b.failed_count}</div>
                              <div className="text-[8px] font-bold text-[#333] uppercase">Failed</div>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className={`px-2 py-1 rounded-sm text-[9px] font-black uppercase tracking-widest border inline-flex items-center gap-1.5 ${getStatusStyle(b.status)}`}>
                          {b.status === 'sending' && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                          {b.status}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[10px] font-medium text-[#444]">
                          {new Date(b.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {b.status === 'draft' && (
                            <button 
                              onClick={() => handleSendNow(b.id)}
                              disabled={sendingId === b.id}
                              className="bg-emerald-500/10 text-emerald-500 p-2 rounded-sm hover:bg-emerald-500/20 transition-all border border-emerald-500/20"
                              title="Send Now"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button className="bg-white/5 text-[#444] p-2 rounded-sm hover:bg-white/10 hover:text-white transition-all border border-white/5">
                             <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <EmptyState 
                  icon={Send}
                  title="NO_BROADCAST_HISTORY"
                  description="Communication protocols indicate zero historical mass transmissions."
                />
              </div>
            )}
          </div>
        )}
      </div>

      <CreateBroadcastModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={() => {
          setIsModalOpen(false)
          fetchBroadcasts()
        }}
      />
    </div>
  )
}
