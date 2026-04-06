import { NextResponse } from "next/server"
import { aggregateReportData } from "@/lib/admin/reports"

export async function POST(req: Request) {
  try {
    const { merchantId, reportType, periodStart, periodEnd } = await req.json()
    const reportData = await aggregateReportData(merchantId, periodStart, periodEnd, reportType)
    return NextResponse.json({ success: true, reportData })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message, stack: error.stack })
  }
}
