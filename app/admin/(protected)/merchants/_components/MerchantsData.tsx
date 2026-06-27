import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import MerchantsShell from "./MerchantsShell"
import type { MerchantListItem } from "./MerchantsTable"

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label, count, color,
}: { label: string; count: number; color: "emerald" | "amber" | "red" | "zinc" }) {
  const colorMap = {
    emerald: { bg: "bg-emerald-500/5",  border: "border-emerald-500/20", text: "text-emerald-400",  dot: "bg-emerald-400" },
    amber:   { bg: "bg-amber-500/5",    border: "border-amber-500/20",   text: "text-amber-400",    dot: "bg-amber-400"   },
    red:     { bg: "bg-red-500/5",      border: "border-red-500/20",     text: "text-red-400",      dot: "bg-red-400"     },
    zinc:    { bg: "bg-muted/10",     border: "border-border",    text: "text-foreground",     dot: "bg-muted-foreground"    },
  }
  const c = colorMap[color]
  return (
    <div className={`${c.bg} border ${c.border} rounded-lg p-5 flex items-center justify-between group hover:border-white/10 transition-colors`}>
      <div className="space-y-1">
        <div className="text-[9px] font-bold uppercase tracking-widest text-[#555]">{label}</div>
        <div className={`text-3xl font-black font-mono tracking-tighter ${c.text}`}>{count}</div>
      </div>
      <div className={`w-3 h-3 rounded-full ${c.dot} opacity-60 group-hover:animate-pulse`} />
    </div>
  )
}

// ─── Server component ─────────────────────────────────────────────────────────

export default async function MerchantsData() {
  // 1. Fetch accounts with billing fields + related counts
  const { data: accounts, error: accountError } = (await supabaseAdmin
    .from("accounts")
    .select(`
      account_id,
      business_name,
      created_at,
      plan_tier,
      subscription_status,
      subscription_current_period_end,
      staff(email, role),
      stores(count),
      product_styles(count)
    `)
    .order("created_at", { ascending: false })) as any

  if (accountError) {
    console.error("Error fetching accounts:", accountError)
    throw new Error("Failed to load merchants")
  }

  // 2. Fetch sales to calculate total_sales per account
  const { data: sales } = await supabaseAdmin
    .from("sales")
    .select("grand_total, stores(account_id)")

  const salesMap: Record<string, number> = {}
  sales?.forEach((s: any) => {
    const aid = s.stores?.account_id
    if (aid) salesMap[aid] = (salesMap[aid] || 0) + Number(s.grand_total)
  })

  // 3. Map to MerchantListItem
  const merchantList: MerchantListItem[] = (accounts as any[]).map((acc: any) => {
    const owner = acc.staff?.find((s: any) => s.role === "owner")
    return {
      account_id:                      acc.account_id,
      business_name:                   acc.business_name || "Untitled Business",
      owner_email:                     owner?.email || "No owner found",
      store_count:                     (acc.stores as any)?.[0]?.count || 0,
      product_count:                   (acc.product_styles as any)?.[0]?.count || 0,
      total_sales:                     salesMap[acc.account_id] || 0,
      created_at:                      acc.created_at,
      plan_tier:                       acc.plan_tier ?? null,
      subscription_status:             acc.subscription_status ?? null,
      subscription_current_period_end: acc.subscription_current_period_end ?? null,
    }
  })

  // 4. Billing stat counts
  const counts = {
    active:    merchantList.filter(m => m.subscription_status === "active").length,
    trial:     merchantList.filter(m => m.subscription_status === "trial").length,
    past_due:  merchantList.filter(m => m.subscription_status === "past_due").length,
    suspended: merchantList.filter(m => m.subscription_status === "suspended").length,
  }

  return (
    <div className="px-8 py-8 md:px-12 max-w-7xl mx-auto">
      {/* Table Shell (client component — handles Header + Actions + Table) */}
      <div className="space-y-8">
        
        {/* Billing Stat Cards Section */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-500">
          <StatCard label="Active"    count={counts.active}    color="emerald" />
          <StatCard label="Trial"     count={counts.trial}     color="amber"   />
          <StatCard label="Past Due"  count={counts.past_due}  color="red"     />
          <StatCard label="Suspended" count={counts.suspended} color="zinc"    />
        </div>

        <MerchantsShell merchants={merchantList} />
      </div>
    </div>
  )
}
