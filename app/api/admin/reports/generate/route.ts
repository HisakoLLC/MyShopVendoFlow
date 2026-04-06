import { ADMIN_SCHEMA } from "@/lib/admin/billing-helpers"
import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { getServerAdminUser } from "@/lib/admin/auth"
import { aggregateReportData } from "@/lib/admin/reports"
import { PERMISSIONS, hasPermission } from "@/lib/admin/permissions"

export async function POST(req: Request) {
  try {
    const { merchantId, reportType, periodStart, periodEnd } = await req.json()
    const supabase = await createServerSupabaseClient()
    
    // 1. Auth & Admin Check
    const adminUser = await getServerAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized: Admin access only" }, { status: 401 })
    }

    // 1b. Verify Role-Based Permission
    if (!hasPermission(adminUser.role, 'reports_generate')) {
      return NextResponse.json({ 
        error: "Permission Denied", 
        detail: `Role '${adminUser.role}' is not authorized to generate reports.` 
      }, { status: 403 })
    }

    // 2. Aggregate Data using shared service
    const reportData = await aggregateReportData(merchantId, periodStart, periodEnd, reportType)

    // 3. Save Report
    const { data: report, error } = await supabaseAdmin
      .schema(ADMIN_SCHEMA as any)
      .from("reports")
      .insert({
        merchant_id: merchantId,
        report_type: reportType,
        period_start: periodStart,
        period_end: periodEnd,
        status: "draft",
        data: reportData,
        created_by: adminUser.id
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(report)

  } catch (error: any) {
    console.error("Manual Report Generation Error:", error)
    return NextResponse.json({ 
      error: error.message || String(error), 
      detail: error.stack 
    }, { status: 500 })
  }
}


