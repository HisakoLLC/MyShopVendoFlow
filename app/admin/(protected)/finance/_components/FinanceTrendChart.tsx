"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface FinanceTrendChartProps {
  data: any[]
}

export default function FinanceTrendChart({ data }: FinanceTrendChartProps) {
  return (
    <div className="h-[300px] w-full bg-[#111] border border-[#1f1f1f] rounded-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-[10px] text-[#444] uppercase font-black tracking-[0.2em]">Monthly Revenue Trend</h3>
        <span className="text-[10px] text-[#22c55e] font-bold uppercase tracking-widest bg-[#22c55e]/10 px-2 py-0.5 rounded border border-[#22c55e]/20">SaaS Growth</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
          <XAxis 
            dataKey="month" 
            stroke="#444" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(val) => val.split("-")[1] + " " + val.split("-")[0].slice(2)}
          />
          <YAxis 
            stroke="#444" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(val) => `K${val/1000}k`}
          />
          <Tooltip 
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
            contentStyle={{ 
              backgroundColor: "#0d0d0d", 
              border: "1px solid #1f1f1f", 
              borderRadius: "8px",
              fontSize: "12px",
              color: "#fff"
            }}
            itemStyle={{ color: "#22c55e" }}
            formatter={(value) => [`KES ${Number(value).toLocaleString()}`, "Revenue"]}
          />
          <Bar 
            dataKey="amount" 
            fill="#22c55e" 
            radius={[4, 4, 0, 0]} 
            barSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
