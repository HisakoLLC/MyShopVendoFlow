import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getSupabaseUrl } from "@/lib/supabase/env"
import { verifyPIN } from "@/lib/auth/pin-auth"

const POS_STAFF_SHARED_EMAIL = "pos-staff@vendoflow.internal"
const LOCKOUT_ATTEMPTS = 3
const LOCKOUT_MINUTES = 5

const UUID_REGEX =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

function normalizeUuid(value: string): string {
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

    let accountId: string | null = bodyAccountId && typeof bodyAccountId === "string" ? bodyAccountId : null

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
      accountId = typeof store.account_id === "string" ? store.account_id : String(store.account_id)
    }

    const accountIdNorm = normalizeUuid(accountId)
    const storeIdNorm = normalizeUuid(store_id)

    // Fetch active staff for this account that have a PIN (and optionally match store)
    const { data: staffRows, error: staffError } = await supabaseAdmin
      .from("staff")
      .select("staff_id, account_id, email, pin_hash, assigned_store_id, active, failed_attempts, locked_until")
      .eq("account_id", accountIdNorm)
      .eq("active", true)
      .not("pin_hash", "is", null)
      .limit(100)

    if (staffError || !staffRows?.length) {
      return NextResponse.json(
        { error: "Invalid PIN for this store" },
        { status: 401 }
      )
    }

    const now = new Date()
    type StaffRow = (typeof staffRows)[0] & { failed_attempts?: number | null; locked_until?: string | null }
    const withLock = (row: StaffRow) => {
      const lockedUntil = row.locked_until ? new Date(row.locked_until) : null
      if (lockedUntil && lockedUntil > now) {
        const mins = Math.ceil((lockedUntil.getTime() - now.getTime()) / 60_000)
        return { locked: true as const, mins }
      }
      return { locked: false as const }
    }

    // Prefer staff assigned to this store, then any staff for account
    const byStore = staffRows.filter(
      (r) =>
        normalizeUuid(String((r as StaffRow).assigned_store_id ?? "")) === storeIdNorm
    )
    const list = byStore.length > 0 ? byStore : staffRows

    for (const row of list as StaffRow[]) {
      const lock = withLock(row)
      if (lock.locked) {
        return NextResponse.json(
          { error: `Too many failed attempts. Try again in ${lock.mins} minute(s).` },
          { status: 403 }
        )
      }
      const hash = row.pin_hash
      if (!hash) continue
      const match = await verifyPIN(trimmedPin, hash)
      if (match) {
        // Reset failed attempts on success
        await supabaseAdmin
          .from("staff")
          .update({ failed_attempts: 0, locked_until: null })
          .eq("staff_id", row.staff_id)

        // Ensure shared POS staff user exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
        let sharedUser = existingUsers?.users?.find((u) => u.email === POS_STAFF_SHARED_EMAIL)
        if (!sharedUser) {
          const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
            email: POS_STAFF_SHARED_EMAIL,
            password: crypto.randomUUID() + crypto.randomUUID(),
            email_confirm: true,
          })
          if (createErr || !created.user) {
            return NextResponse.json(
              { error: "Could not create sign-in session. Try again." },
              { status: 500 }
            )
          }
          sharedUser = created.user
        }

        // Do not set metadata here (race with concurrent logins). Redirect URL carries staff_id/account_id; /api/auth/bind-staff sets metadata after landing.

        const origin =
          request.headers.get("origin") ||
          request.headers.get("referer")?.replace(/\/[^/]*$/, "") ||
          ""
        const redirectPath = `/pos?staff_id=${encodeURIComponent(row.staff_id)}&account_id=${encodeURIComponent(accountIdNorm)}`
        const redirectTo = origin ? `${origin}${redirectPath}` : redirectPath

        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email: POS_STAFF_SHARED_EMAIL,
          options: { redirectTo },
        })

        if (linkError || !linkData?.properties?.action_link) {
          return NextResponse.json(
            { error: "Could not create sign-in link. Try again." },
            { status: 500 }
          )
        }

        const actionLink = linkData.properties.action_link as string
        const baseUrl = supabaseUrl.replace(/\/$/, "")
        const signInLink = actionLink.startsWith("http") ? actionLink : `${baseUrl}/${actionLink}`

        return NextResponse.json({ sign_in_link: signInLink })
      }
    }

    // No match: optionally increment failed_attempts only when single staff (so we know who tried)
    if (list.length === 1) {
      const row = list[0] as StaffRow
      const current = Number(row.failed_attempts) || 0
      const nextAttempts = current + 1
      const updates: { failed_attempts: number; locked_until?: string } = {
        failed_attempts: nextAttempts,
      }
      if (nextAttempts >= LOCKOUT_ATTEMPTS) {
        const lockedUntil = new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000)
        updates.locked_until = lockedUntil.toISOString()
      }
      await supabaseAdmin.from("staff").update(updates).eq("staff_id", row.staff_id)
    }

    return NextResponse.json(
      { error: "Invalid PIN. Try again." },
      { status: 401 }
    )
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
