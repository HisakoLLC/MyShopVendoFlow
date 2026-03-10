import { NextRequest, NextResponse } from "next/server"
import { v4 as uuidv4 } from "uuid"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const storeId = formData.get("store_id") as string | null

    if (!file || !storeId) {
      return NextResponse.json({ error: "Missing file or store_id" }, { status: 400 })
    }

    // Resolve account_id for current user
    const { data: accountIdRaw, error: accountError } = await supabase.rpc("get_account_id")
    if (accountError || !accountIdRaw) {
      return NextResponse.json({ error: "Account not found" }, { status: 403 })
    }
    const accountId =
      typeof accountIdRaw === "string"
        ? accountIdRaw
        : Array.isArray(accountIdRaw)
          ? accountIdRaw[0]
          : accountIdRaw && typeof accountIdRaw === "object" && "account_id" in accountIdRaw
            ? (accountIdRaw as { account_id: string }).account_id
            : null

    if (!accountId) {
      return NextResponse.json({ error: "Account not found" }, { status: 403 })
    }

    // Verify store belongs to this account
    const { data: storeRow, error: storeError } = await supabase
      .from("stores")
      .select("store_id")
      .eq("store_id", storeId)
      .eq("account_id", accountId)
      .maybeSingle()

    if (storeError || !storeRow) {
      return NextResponse.json({ error: "Store not found or access denied" }, { status: 403 })
    }

    // Validate file size and type (mirror business logo rules)
    if (file.size > 200 * 1024) {
      return NextResponse.json({ error: "File size must be less than 200KB." }, { status: 400 })
    }

    const validTypes = ["image/png", "image/jpeg", "image/jpg"]
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "File must be PNG or JPG." }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"
    const filePath = `${accountId}/stores/${storeId}/${uuidv4()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from("business-logos")
      .upload(filePath, buffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      return NextResponse.json({ error: `Logo upload failed: ${uploadError.message}` }, { status: 500 })
    }

    const { data: publicData } = supabase.storage.from("business-logos").getPublicUrl(filePath)
    const logoUrl = publicData.publicUrl

    const { error: updateError } = await supabase
      .from("stores")
      .update({
        logo_url: logoUrl,
      })
      .eq("store_id", storeId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ logo_url: logoUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to upload store logo"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

