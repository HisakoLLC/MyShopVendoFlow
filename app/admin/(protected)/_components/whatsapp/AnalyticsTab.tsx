"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts"
import { ArrowUpRight, ArrowDownLeft, Users, Zap, MessageSquare, Send, CheckCircle2, AlertCircle } from "lucide-react"
import { adminToast } from "@/lib/admin/toast"
import { LoadingSkeleton } from "@/app/admin/(protected)/_components/ui/LoadingSkeleton"
import { EmptyState } from "@/app/admin/(protected)/_components/ui/EmptyState"

export default function AnalyticsTab() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("7d")

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/whatsapp/analytics?period=${period}`)
      const json = await res.json()
      setData(json)
    } catch (err) {
      adminToast.error("Failed to synchronize analytics")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  if (loading && !data) {
    return <LoadingSkeleton className="h-full w-full" />
  }

  return (
    <div className="flex-1 flex flex-col bg-[#0a0a0a] overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-[#1a1a1a] flex items-center px-8 justify-between bg-[#0d0d0d]/30 backdrop-blur-md shrink-0">
        <div className="space-y-0.5">
          <h2 className="text-sm font-black text-white uppercase tracking-widest">Protocol Intelligence</h2>
          <p className="text-[10px] text-[#444] font-bold uppercase tracking-widest">Signal pattern analysis</p>
        </div>
        <div className="flex bg-[#111] border border-[#1a1a1a] p-1 rounded-sm">
           {["7d", "30d", "90d"].map(p => (
             <button
               key={p}
               onClick={() => setPeriod(p)}
               className={`px-4 py-1 text-[9px] font-black uppercase tracking-widest transition-all rounded-sm ${
                 period === p ? "bg-[#22c55e] text-black" : "text-[#444] hover:text-white"
               }`}
             >
               {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : 'Quarterly'}
             </button>
           ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
        {!data ? (
           <EmptyState 
             icon={Zap}
             title="NO_PROTOCOL_DATA"
             description="Signal intelligence stream is currently void of analysis packets."
           />
        ) : (
          <>
            {/* Row 1: Stat Cards */}
            <div className="grid grid-cols-4 gap-6">
              {[
                { label: "Messages Sent", value: data?.stats?.sent, icon: ArrowUpRight, color: "text-[#22c55e]" },
                { label: "Messages Received", value: data?.stats?.received, icon: ArrowDownLeft, color: "text-zinc-500" },
                { label: "Active Channels", value: data?.stats?.activeConversations, icon: MessageSquare, color: "text-white" },
                { label: "Response Rate", value: `${data?.stats?.responseRate}%`, icon: Zap, color: "text-amber-500" },
              ].map((stat, i) => (
                <div key={i} className="p-6 bg-[#0d0d0d] border border-[#1a1a1a] rounded-sm group hover:border-white/10 transition-all relative overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-[9px] font-black text-[#444] uppercase tracking-[0.2em]">{stat.label}</div>
                    <stat.icon className={`w-4 h-4 ${stat.color} opacity-50`} />
                  </div>
                  <div className="text-3xl font-black text-white tracking-tighter mb-1">{stat.value}</div>
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-[#22c55e]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>

            {/* Row 2: Charts */}
            <div className="grid grid-cols-2 gap-6">
              <div className="p-8 bg-[#0d0d0d] border border-[#1a1a1a] rounded-sm flex flex-col h-[400px]">
                <div className="text-[10px] font-black text-[#666] uppercase tracking-[0.3em] mb-8 flex items-center justify-between">
                   Communication Volume
                   <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                         <div className="w-2 h-2 bg-[#22c55e] rounded-full" />
                         <span className="text-[8px] font-bold text-[#444]">SENT</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                         <div className="w-2 h-2 bg-[#222] rounded-full" />
                         <span className="text-[8px] font-bold text-[#444]">RECEIVED</span>
                      </div>
                   </div>
                </div>
                <div className="flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data?.dailyVolume}>
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#333', fontSize: 10, fontWeight: 900 }}
                        tickFormatter={(str: string) => new Date(str).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                      />
                      <YAxis hide />
                      <RechartsTooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.02)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                             const p0 = payload[0] as any;
                             const p1 = payload[1] as any;
                            return (
                              <div className="bg-black border border-[#1a1a1a] p-3 shadow-2xl">
                                 <div className="text-[9px] font-black text-[#444] uppercase mb-2 border-b border-[#1a1a1a] pb-1">{p0.payload.date}</div>
                                 <div className="space-y-1">
                                    <div className="text-[10px] font-bold text-[#22c55e] flex justify-between gap-4">
                                       <span>SENT</span>
                                       <span>{p0.value}</span>
                                    </div>
                                    <div className="text-[10px] font-bold text-white flex justify-between gap-4">
                                       <span>RCVD</span>
                                       <span>{p1.value}</span>
                                    </div>
                                 </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                      <Bar dataKey="sent" fill="#22c55e" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="received" fill="#222" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-8 bg-[#0d0d0d] border border-[#1a1a1a] rounded-sm flex flex-col h-[400px]">
                <div className="text-[10px] font-black text-[#666] uppercase tracking-[0.3em] mb-8">Channel Status Distribution</div>
                <div className="flex-1 flex flex-col justify-center space-y-6">
                  {data?.conversationStatus?.map((item: any, i: number) => {
                     const total = data.conversationStatus.reduce((acc: number, cur: any) => acc + cur.count, 0)
                     const percentage = (item.count / total) * 100
                     return (
                       <div key={i} className="space-y-2">
                          <div className="flex justify-between items-end">
                             <div className="text-[10px] font-black text-white uppercase tracking-wider">{item.status}</div>
                             <div className="text-[10px] font-black text-[#444]">{item.count} <span className="text-[8px] opacity-50">({percentage.toFixed(0)}%)</span></div>
                          </div>
                          <div className="h-6 bg-[#0a0a0a] rounded-sm border border-[#1a1a1a] relative overflow-hidden p-0.5">
                             <div 
                               className="h-full bg-white transition-all duration-1000" 
                               style={{ width: `${percentage}%`, opacity: 0.1 + (0.9 * (i+1) / data.conversationStatus.length) }} 
                             />
                          </div>
                       </div>
                     )
                  })}
                </div>
              </div>
            </div>

            {/* Row 3: Tables */}
            <div className="grid grid-cols-2 gap-6">
               {/* Template Usage */}
               <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-sm overflow-hidden flex flex-col">
                  <div className="px-6 py-4 border-b border-[#1a1a1a] bg-[#111] flex items-center justify-between">
                    <div className="text-[10px] font-black text-[#444] uppercase tracking-widest">Protocol Usage</div>
                    <div className="text-[9px] font-black text-[#22c55e] uppercase">Top Performers</div>
                  </div>
                  <div className="p-0 overflow-x-auto">
                     <table className="w-full text-left">
                        <tbody className="divide-y divide-[#1a1a1a]">
                           {data?.templateUsage?.map((t: any, i: number) => (
                             <tr key={i} className="group hover:bg-[#111] transition-colors">
                                <td className="px-6 py-4">
                                   <div className="text-[10px] font-black text-white uppercase tracking-tight">{t.name}</div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                   <span className="text-[10px] font-black text-[#22c55e] px-2 py-0.5 bg-[#22c55e]/5 border border-[#22c55e]/10 rounded-sm">{t.count} transmits</span>
                                </td>
                             </tr>
                           ))}
                           {(!data?.templateUsage || data.templateUsage.length === 0) && (
                             <tr>
                                <td className="px-6 py-8 text-center text-[10px] font-bold text-[#333] uppercase">No protocol data recorded</td>
                             </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>

               {/* Recent Broadcasts */}
               <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-sm overflow-hidden flex flex-col">
                  <div className="px-6 py-4 border-b border-[#1a1a1a] bg-[#111] flex items-center justify-between">
                    <div className="text-[10px] font-black text-[#444] uppercase tracking-widest">Recent Broadcast Logs</div>
                    <Users className="w-3.5 h-3.5 text-[#22c55e] opacity-30" />
                  </div>
                  <div className="p-0 overflow-x-auto">
                     <table className="w-full text-left">
                        <tbody className="divide-y divide-[#1a1a1a]">
                           {data?.recentBroadcasts?.map((b: any, i: number) => (
                             <tr key={i} className="group hover:bg-[#111] transition-colors">
                                <td className="px-6 py-4">
                                   <div className="text-[10px] font-black text-white uppercase truncate max-w-[200px]">{b.name}</div>
                                   <div className="text-[8px] font-bold text-[#333] uppercase">{new Date(b.sent_at).toLocaleDateString()}</div>
                                </td>
                                <td className="px-6 py-4">
                                   <div className="flex items-center gap-4">
                                      <div className="text-[10px] font-black text-emerald-500">{b.sent_count}</div>
                                      <div className="text-[10px] font-black text-red-500">{b.failed_count}</div>
                                   </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                   <div className={`px-2 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-widest border inline-flex items-center gap-1 ${
                                     b.status === 'completed' ? 'text-emerald-500 border-emerald-500/20 bg-emerald-500/5' : 'text-amber-500 border-amber-500/20 bg-amber-500/5'
                                   }`}>
                                      {b.status === 'completed' ? <CheckCircle2 className="w-2 h-2" /> : <AlertCircle className="w-2 h-2" />}
                                      {b.status}
                                   </div>
                                </td>
                             </tr>
                           ))}
                           {(!data?.recentBroadcasts || data.recentBroadcasts.length === 0) && (
                             <tr>
                                <td className="px-6 py-8 text-center text-[10px] font-bold text-[#333] uppercase">No historical logs</td>
                             </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
