import { ADMIN_SCHEMA } from "@/lib/admin/billing-helpers"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { aggregateReportData } from "@/lib/admin/reports"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  try {
    // 1. Authorization Check (Vercel Cron)
    const authHeader = req.headers.get("Authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      // For local testing, we might want to allow without secret if env is development
    }

    const now = new Date()
    const yesterday = new Date(now)
    yesterday.setDate(now.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split("T")[0]

    // 2. Fetch Schedule Settings
    const { data: scheduleSettings } = await supabaseAdmin
      .schema('admin' as any)
      .from('settings')
      .select('key, value')
      .in('key', ['report_schedule_daily', 'report_schedule_weekly', 'report_schedule_monthly', 'auto_report_generation'])

    const getSetting = (key: string) => {
      const s = scheduleSettings?.find(x => x.key === key)
      return s?.value?.enabled
    }

    const reportTypes: ("daily" | "weekly" | "monthly")[] = []
    
    // Daily: Check new key or fall back to old key
    const dailyEnabled = getSetting('report_schedule_daily') ?? getSetting('auto_report_generation') ?? true
    if (dailyEnabled) reportTypes.push("daily")

    // Weekly: Only on Mondays + Setting Enabled
    if (now.getDay() === 1 && getSetting('report_schedule_weekly')) {
      reportTypes.push("weekly")
    }
    
    // Monthly: Only on the 1st + Setting Enabled
    if (now.getDate() === 1 && getSetting('report_schedule_monthly')) {
      reportTypes.push("monthly")
    }

    if (reportTypes.length === 0) {
      return NextResponse.json({ message: "No automated reports scheduled for today or schedules disabled.", generated: 0, skipped: 0, errors: [] })
    }

    // 3. Fetch Active Merchants
    const { data: merchants, error: merchantError } = await supabaseAdmin
      .from("accounts")
      .select("id, business_name")
      // .eq('active', true) // Assuming active flag exists or can be added

    if (merchantError) throw merchantError

    let generated = 0
    let skipped = 0
    let errors: string[] = []

    for (const merchant of (merchants || [])) {
      for (const type of reportTypes) {
        try {
          // Define period
          let start = yesterdayStr
          let end = yesterdayStr

          if (type === "weekly") {
            const lastMon = new Date(now)
            lastMon.setDate(now.getDate() - 7)
            const lastSun = new Date(now)
            lastSun.setDate(now.getDate() - 1)
            start = lastMon.toISOString().split("T")[0]
            end = lastSun.toISOString().split("T")[0]
          } else if (type === "monthly") {
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
            start = lastMonth.toISOString().split("T")[0]
            end = lastMonthEnd.toISOString().split("T")[0]
          }

          // Check for existing
          const { data: existing } = await supabaseAdmin
            .schema(ADMIN_SCHEMA as any)
            .from("reports")
            .select("id")
            .eq("merchant_id", merchant.id)
            .eq("report_type", type)
            .eq("period_start", start)
            .single()

          if (existing) {
            skipped++
            continue
          }

          // Generate
          const reportData = await aggregateReportData(merchant.id, start, end)

          // Insert
          await supabaseAdmin
            .schema(ADMIN_SCHEMA as any)
            .from("reports")
            .insert({
              merchant_id: merchant.id,
              report_type: type,
              period_start: start,
              period_end: end,
              status: "draft",
              report_data: reportData,
              created_by: "00000000-0000-0000-0000-000000000000" // System / Cron ID
            })
          
          generated++
        } catch (err: any) {
          errors.push(`${merchant.business_name} (${type}): ${err.message}`)
        }
      }
    }

    return NextResponse.json({ generated, skipped, errors })

  } catch (error: any) {
    console.error("Cron Generation Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

