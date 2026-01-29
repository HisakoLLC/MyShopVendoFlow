import { NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { getSignedStorageUrl, isSupabaseStorageUrl } from "@/lib/signed-storage-url"

/**
 * GET /api/signed-url?url=...
 * Returns a signed URL for a Supabase storage public URL so the image can be loaded in the browser (private buckets).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get("url")
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 })
  }
  if (!isSupabaseStorageUrl(url)) {
    return NextResponse.json({ url }, { status: 200 })
  }
  try {
    const supabase = await createServerSupabaseClient()
    const signed = await getSignedStorageUrl(supabase, url)
    return NextResponse.json({ url: signed ?? url })
  } catch (e) {
    console.error("signed-url API error:", e)
    return NextResponse.json({ error: "Failed to sign URL" }, { status: 500 })
  }
}
