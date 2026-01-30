import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseUrl } from "@/lib/supabase/env"
import { createHash } from "crypto"

function hashPIN(pin: string): string {
  return createHash("sha256").update(pin).digest("hex")
}

/** Normalize for comparison: UUIDs are case-insensitive per RFC. */
function normalizeAccountIdForCompare(value: string): string {
  const s = value.trim()
  if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(s)) {
    return s.toLowerCase()
  }
  return s
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
    const accountIdStr =
      typeof accountId === "string"
        ? accountId
        : Array.isArray(accountId)
          ? accountId[0]
          : typeof accountId === "object" && accountId !== null && "account_id" in accountId
            ? (accountId as { account_id: string }).account_id
            : String(accountId)
    const accountIdForQuery = normalizeAccountIdForCompare(accountIdStr)

    // 1) Try exact match: account_id + pin_hash + active (use normalized UUID for query)
    let { data: staff, error: staffError } = await supabaseAdmin
      .from("staff")
      .select("email, account_id")
      .eq("account_id", accountIdForQuery)
      .eq("pin_hash", pinHash)
      .eq("active", true)
      .limit(1)
      .maybeSingle()

    // 2) If no match, staff may have been saved with account_id in a different format (e.g. from get_account_id); find by PIN then filter by account
    if ((staffError || !staff?.email) && pinHash) {
      const { data: byPin, error: byPinError } = await supabaseAdmin
        .from("staff")
        .select("email, account_id")
        .eq("pin_hash", pinHash)
        .eq("active", true)
        .limit(20)

      if (!byPinError && byPin && byPin.length > 0) {
        const normalized = (aid: string | null | unknown): string => {
          if (aid == null) return ""
          if (typeof aid === "string") return aid
          if (Array.isArray(aid)) return aid[0] ?? ""
          if (typeof aid === "object" && aid !== null && "account_id" in aid)
            return (aid as { account_id: string }).account_id
          return String(aid)
        }
        const match = byPin.find(
          (s) => normalizeAccountIdForCompare(normalized(s.account_id)) === accountIdForQuery
        )
        if (match?.email) {
          staff = { email: match.email, account_id: match.account_id }
          staffError = null
        }
      }
    }

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
