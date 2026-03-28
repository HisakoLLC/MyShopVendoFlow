"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAdminUser } from "@/lib/admin/AdminUserContext"
import { adminToast } from "@/lib/admin/toast"
import PermissionGate from "../../_components/PermissionGate"
import { 
  MessageSquare, 
  Calendar, 
  Bell, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  ChevronRight,
  Monitor,
  Database,
  ShieldAlert,
  Save,
  Loader2,
  Lock
} from "lucide-react"

interface SettingsClientProps {
  initialSettings: any
  whatsappPhoneId: string
}

export default function SettingsClient({ initialSettings, whatsappPhoneId }: SettingsClientProps) {
  const router = useRouter()
  const { role } = useAdminUser()
  const isSuperAdmin = role === "super_admin"
  
  const [autoGen, setAutoGen] = useState(initialSettings.auto_report_generation?.enabled ?? true)
  const [isSaving, setIsSaving] = useState(false)

  const saveSetting = async (key: string, value: any) => {
    setIsSaving(true)
    const toastId = adminToast.loading("Persisting configuration...")
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value })
      })
      if (!res.ok) throw new Error("Update failed")
      adminToast.success("System configuration updated")
      router.refresh()
    } catch (err) {
      adminToast.error("Configuration persistence failed")
    } finally {
      adminToast.dismiss(toastId)
      setIsSaving(false)
    }
  }

  const templates = [
    { name: "daily_sales_report", params: "name, date", type: "Marketing" },
    { name: "weekly_sales_report", params: "name, start_date, end_date", type: "Utility" },
    { name: "monthly_sales_report", params: "name, month", type: "Utility" },
    { name: "service_alert", params: "details", type: "Authentication" },
    { name: "payment_receipt", params: "merchant, amount", type: "Marketing" },
    { name: "account_invite", params: "name, link", type: "Utility" },
    { name: "staff_invitation", params: "name, role, link", type: "Utility" }
  ]

  return (
    <PermissionGate 
      permission="settings_manage"
      fallback={
        <div className="flex flex-col items-center justify-center py-32 border border-[#1f1f1f] border-dashed rounded-3xl bg-white/[0.01]">
          <div className="w-16 h-16 rounded-full bg-[#111] border border-[#1f1f1f] flex items-center justify-center mb-6 shadow-2xl">
            <Lock className="w-8 h-8 text-[#444]" />
          </div>
          <h2 className="text-white text-xl font-bold tracking-tighter uppercase mb-3">System Access Restricted</h2>
          <p className="text-[#444] text-[10px] font-black uppercase tracking-[0.2em] max-w-sm text-center border-t border-[#1f1f1f] pt-6 mt-2 leading-relaxed">
            Administrative configuration of the VendoFlow platform is reserved for senior system architects. Please contact your technical lead if you require access to these protocols.
          </p>
        </div>
      }
    >
      <div className="max-w-4xl mx-auto space-y-12">
        <div>
          <div className="text-[#444] text-[10px] font-black uppercase tracking-[0.2em] mb-1">System Configuration</div>
          <h1 className="text-white text-3xl font-bold tracking-tighter">Settings</h1>
        </div>

        {/* WhatsApp Configuration */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
             <MessageSquare className="w-5 h-5 text-[#22c55e]" />
             <h2 className="text-white text-lg font-bold tracking-tight">WhatsApp Configuration</h2>
          </div>
          
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl overflow-hidden p-6 space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-1.5">
                   <label className="text-[10px] text-[#444] uppercase font-bold tracking-widest">Phone Number ID</label>
                   <div className="flex items-center gap-2">
                      <code className="text-xs text-white bg-white/5 px-2 py-1 rounded border border-[#1f1f1f] flex-1 truncate">{whatsappPhoneId || 'Not Configured'}</code>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] text-[8px] font-black uppercase">
                         <CheckCircle className="w-3 h-3" /> Connected
                      </div>
                   </div>
                </div>
                <div className="space-y-1.5 opacity-50">
                   <label className="text-[10px] text-[#444] uppercase font-bold tracking-widest">Meta API Status</label>
                   <div className="text-xs text-[#666]">Meta Cloud API v18.0</div>
                </div>
             </div>

             <div className="pt-4 border-t border-[#1f1f1f]">
                <div className="text-[10px] text-[#444] uppercase font-black tracking-widest mb-4">Approved Templates</div>
                <div className="bg-black/40 border border-[#1f1f1f] rounded-xl overflow-hidden">
                   <table className="w-full text-left">
                      <thead>
                         <tr className="bg-white/5 border-b border-[#1f1f1f] text-[9px] text-[#444] uppercase font-bold tracking-widest">
                            <th className="px-4 py-3">Template Name</th>
                            <th className="px-4 py-3">Parameters</th>
                            <th className="px-4 py-3">Category</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1f1f1f]">
                         {templates.map(tmp => (
                           <tr key={tmp.name} className="text-[10px] font-mono">
                              <td className="px-4 py-3 text-white">{tmp.name}</td>
                              <td className="px-4 py-3 text-[#555]">{tmp.params}</td>
                              <td className="px-4 py-3">
                                 <span className="text-[8px] font-black uppercase text-[#444]">{tmp.type}</span>
                              </td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
                <p className="mt-4 text-[10px] text-[#444] italic flex items-center gap-2">
                  <Info className="w-3.5 h-3.5" />
                  Template changes require Meta approval. Contact your developer to add new templates.
                </p>
             </div>
          </div>
        </section>

        {/* Report Schedule */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
             <Calendar className="w-5 h-5 text-blue-400" />
             <h2 className="text-white text-lg font-bold tracking-tight">Automated Report Schedule</h2>
          </div>
          
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6 space-y-8">
             <div className="space-y-6">
                {[
                  { 
                    key: 'report_schedule_daily', 
                    title: 'Daily Reports', 
                    sub: 'Runs at 6:00 AM UTC every morning', 
                    current: initialSettings.report_schedule_daily?.enabled ?? initialSettings.auto_report_generation?.enabled ?? true 
                  },
                  { 
                    key: 'report_schedule_weekly', 
                    title: 'Weekly Reports', 
                    sub: 'Runs every Monday at 6:00 AM UTC', 
                    current: initialSettings.report_schedule_weekly?.enabled ?? false 
                  },
                  { 
                    key: 'report_schedule_monthly', 
                    title: 'Monthly Reports', 
                    sub: 'Runs on the 1st of each month at 6:00 AM UTC', 
                    current: initialSettings.report_schedule_monthly?.enabled ?? false 
                  }
                ].map((sched) => (
                  <div key={sched.key} className="flex items-center justify-between pb-6 border-b border-[#1f1f1f] last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <div className="text-sm font-bold text-white tracking-tight">{sched.title}</div>
                      <div className="text-[10px] text-[#444] font-mono uppercase tracking-widest">{sched.sub}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => saveSetting(sched.key, { enabled: !sched.current })}
                        disabled={isSaving}
                        className={`w-12 h-6 rounded-full transition-all relative ${sched.current ? 'bg-[#22c55e]' : 'bg-[#1f1f1f]'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${sched.current ? 'left-7 shadow-lg' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                ))}
             </div>
             <p className="text-xs text-[#555] max-w-lg leading-relaxed pt-4 border-t border-[#1f1f1f]/50">
               Reports are generated automatically at the scheduled intervals and appear as <span className="text-zinc-400 font-bold">DRAFTS</span> for administrative review. Ensure stakeholders are configured to receive these notifications.
             </p>
          </div>
        </section>

        {/* Notification Preferences */}
        <section className="space-y-6 opacity-50 grayscale">
          <div className="flex items-center gap-3">
             <Bell className="w-5 h-5 text-purple-400" />
             <h2 className="text-white text-lg font-bold tracking-tight">Notification Preferences</h2>
          </div>
          
          <div className="bg-[#111] border border-[#1f1f1f] rounded-2xl p-6 space-y-4">
             {[
               { label: "New WhatsApp Message", sub: "Email me when a customer initiates a conversation" },
               { label: "Report Approved", sub: "Email stakeholders when their report is approved" }
             ].map((pref, i) => (
               <div key={i} className="flex items-center justify-between py-2 border-b border-[#1f1f1f] last:border-0 border-dashed">
                  <div className="space-y-0.5">
                     <div className="text-xs font-bold text-[#888]">{pref.label}</div>
                     <div className="text-[10px] text-[#444]">{pref.sub}</div>
                  </div>
                  <div className="w-10 h-5 rounded-full bg-[#161616] border border-[#1f1f1f] flex items-center px-1">
                     <div className="w-3 h-3 rounded-full bg-[#333]" />
                  </div>
               </div>
             ))}
             <div className="text-[10px] text-[#444] font-black uppercase tracking-widest pt-2">Coming Soon</div>
          </div>
        </section>

        {/* Danger Zone */}
        {isSuperAdmin && (
          <section className="space-y-6">
            <div className="flex items-center gap-3">
               <ShieldAlert className="w-5 h-5 text-red-400" />
               <h2 className="text-white text-lg font-bold tracking-tight">Danger Zone</h2>
            </div>
            
            <div className="bg-[#111] border border-red-900/40 rounded-2xl p-6">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-1">
                     <div className="text-sm font-bold text-white tracking-tight uppercase tracking-widest text-red-400">Export System Data</div>
                     <p className="text-xs text-[#555] max-w-md">Generate a comprehensive export of all merchants, staff records, and financial transactions.</p>
                  </div>
                  <button className="px-6 py-3 border border-red-900/40 text-[10px] font-black uppercase tracking-widest text-[#444] rounded-xl hover:bg-red-900/10 transition-all cursor-not-allowed grayscale">
                    Coming Soon
                  </button>
               </div>
            </div>
          </section>
        )}
      </div>
    </PermissionGate>
  )
}
