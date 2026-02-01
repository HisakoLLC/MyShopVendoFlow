import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseUrl } from "@/lib/supabase/env"
import { createHash } from "crypto"

function hashPIN(pin: string): string {
  return createHash("sha256").update(pin).digest("hex")
}

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

/** Normalize for comparison: UUIDs are case-insensitive per RFC. */
function normalizeUuidForCompare(value: string): string {
  const s = value.trim()
  return UUID_REGEX.test(s) ? s.toLowerCase() : s
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
    if (trimmedPin.length < 6 || !/^\d{6,}$/.test(trimmedPin)) {
      return NextResponse.json(
        { error: "PIN must be 6 digits" },
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
    const accountIdForCompare = normalizeUuidForCompare(accountIdStr)
    const storeIdForCompare = normalizeUuidForCompare(store_id)

    // Find all active staff with this PIN hash; filter by account (and store) in code to avoid DB comparison quirks
    const { data: byPin, error: byPinError } = await supabaseAdmin
      .from("staff")
      .select("email, account_id, assigned_store_id")
      .eq("pin_hash", pinHash)
      .eq("active", true)
      .limit(50)

    const normalized = (aid: string | null | unknown): string => {
      if (aid == null) return ""
      if (typeof aid === "string") return aid
      if (Array.isArray(aid)) return aid[0] ?? ""
      if (typeof aid === "object" && aid !== null && "account_id" in aid)
        return (aid as { account_id: string }).account_id
      return String(aid)
    }

    // Prefer: same account AND (no assigned store OR assigned store = this store)
    const matchWithStore = (s: { account_id: unknown; assigned_store_id: string | null }) => {
      if (normalizeUuidForCompare(normalized(s.account_id)) !== accountIdForCompare) return false
      const assigned = s.assigned_store_id ?? null
      if (assigned != null && normalizeUuidForCompare(assigned) !== storeIdForCompare) return false
      return true
    }
    // Fallback: same account only (in case assigned_store_id is missing or mismatched)
    const matchAccountOnly = (s: { account_id: unknown }) =>
      normalizeUuidForCompare(normalized(s.account_id)) === accountIdForCompare

    const match =
      byPinError || !byPin
        ? null
        : byPin.find(matchWithStore) ?? byPin.find(matchAccountOnly) ?? null

    if (process.env.NODE_ENV === "development" && (byPinError || !match)) {
      const hasPinRows = !byPinError && byPin && byPin.length > 0
      console.log("[pin-login]", {
        store_id,
        store_id_normalized: storeIdForCompare,
        account_id_sent: !!bodyAccountId,
        account_id_for_compare: accountIdForCompare,
        pin_hash_prefix: pinHash.slice(0, 8) + "...",
        by_pin_error: byPinError?.message ?? null,
        by_pin_count: byPin?.length ?? 0,
        first_rows: hasPinRows
          ? byPin!.slice(0, 3).map((r) => ({
              account: normalizeUuidForCompare(normalized(r.account_id)),
              assigned_store: r.assigned_store_id ? normalizeUuidForCompare(r.assigned_store_id) : null,
            }))
          : [],
      })
    }

    if (!match?.email) {
      return NextResponse.json(
        { error: "Invalid PIN for this store" },
        { status: 401 }
      )
    }

    // Sign in via magic link so we don't depend on Auth password (avoids password policy / sync issues)
    const origin = request.headers.get("origin") || request.headers.get("referer")?.replace(/\/[^/]*$/, "") || ""
    const redirectTo = origin ? `${origin}/dashboard` : undefined
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: String(match.email).trim(),
      options: redirectTo ? { redirectTo } : undefined,
    })
    if (linkError || !linkData?.properties?.action_link) {
      return NextResponse.json(
        { error: "Could not create sign-in link. Try again or ask an owner to reset your PIN." },
        { status: 500 }
      )
    }
    const actionLink = linkData.properties.action_link as string
    const baseUrl = supabaseUrl.replace(/\/$/, "")
    const signInLink = actionLink.startsWith("http") ? actionLink : `${baseUrl}/${actionLink}`

    return NextResponse.json({ email: match.email, sign_in_link: signInLink })
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
