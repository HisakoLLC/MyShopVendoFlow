import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseUrl } from "@/lib/supabase/env"
import { createHash } from "crypto"

function hashPIN(pin: string): string {
  return createHash("sha256").update(pin).digest("hex")
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { store_id, account_id: bodyAccountId, pin } = body as {
      store_id?: string
      account_id?: string
      pin?: string
    }

    if (!store_id || typeof store_id !== "string" || !pin || typeof pin !== "string") {
      return NextResponse.json(
        { error: "store_id and pin are required" },
        { status: 400 }
      )
    }

    const trimmedPin = pin.trim()
    if (trimmedPin.length < 4 || !/^\d{4,}$/.test(trimmedPin)) {
      return NextResponse.json(
        { error: "PIN must be at least 4 digits" },
        { status: 400 }
      )
    }

    const serviceRoleKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY
    const supabaseUrl = getSupabaseUrl()
    if (!serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let accountId = bodyAccountId

    if (!accountId) {
      const { data: store, error: storeError } = await supabaseAdmin
        .from("stores")
        .select("account_id")
        .eq("store_id", store_id)
        .single()

      if (storeError || !store?.account_id) {
        return NextResponse.json(
          { error: "Store not found" },
          { status: 404 }
        )
      }
      const raw = store.account_id
      accountId = Array.isArray(raw) ? raw[0] : typeof raw === "object" && raw !== null && "account_id" in raw ? (raw as { account_id: string }).account_id : raw
    }

    const pinHash = hashPIN(trimmedPin)

    // Match staff by account + PIN + active (single-store app; no store filter so PIN works for the account)
    const { data: staff, error: staffError } = await supabaseAdmin
      .from("staff")
      .select("email")
      .eq("account_id", accountId)
      .eq("pin_hash", pinHash)
      .eq("active", true)
      .limit(1)
      .maybeSingle()

    if (staffError || !staff?.email) {
      return NextResponse.json(
        { error: "Invalid PIN for this store" },
        { status: 401 }
      )
    }

    return NextResponse.json({ email: staff.email })
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
