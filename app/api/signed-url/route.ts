import { NextRequest, NextResponse } from "next/server"
import { getSignedStorageUrl, isSupabaseStorageUrl } from "@/lib/signed-storage-url"
import { requireAuth } from "@/lib/api/auth-helper"

/**
 * GET /api/signed-url?url=...
 * Returns a signed URL for a Supabase storage public URL so the image can be loaded in the browser (private buckets).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get("url")
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 })
  }
  if (!isSupabaseStorageUrl(url)) {
    return NextResponse.json({ url }, { status: 200 })
  }
  try {
    const { supabase, error: authError } = await requireAuth(request)
    if (authError) return authError
    const signed = await getSignedStorageUrl(supabase, url)
    return NextResponse.json({ url: signed ?? url })
  } catch (e) {
    console.error("signed-url API error:", e)
    return NextResponse.json({ error: "Failed to sign URL" }, { status: 500 })
  }
}
