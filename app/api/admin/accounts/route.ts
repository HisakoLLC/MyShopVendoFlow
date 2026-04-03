import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { requireSuperAdmin, adminDb, logActivity } from "@/lib/admin/billing-helpers"

export const dynamic = "force-dynamic"

// ── POST /api/admin/accounts ─────────────────────────────────────────────────
// Body: { businessName, ownerName, ownerEmail, ownerPhone?,
//         planTier, storeName?, city?, sendWelcomeWhatsapp? }
export async function POST(req: Request) {
  try {
    const { adminUser, errorResponse } = await requireSuperAdmin()
    if (errorResponse) return errorResponse

    const {
      businessName,
      ownerName,
      ownerEmail,
      ownerPhone,
      planTier,
      storeName,
      city,
      sendWelcomeWhatsapp,
    } = await req.json()

    if (!businessName || !ownerName || !ownerEmail || !planTier) {
      return NextResponse.json(
        { error: "Missing required fields: businessName, ownerName, ownerEmail, planTier" },
        { status: 400 }
      )
    }

    // ── 1. Check email uniqueness ─────────────────────────────────────────────
    const { data: existing } = await supabaseAdmin
      .from("staff")
      .select("staff_id")
      .eq("email", ownerEmail.trim())
      .limit(1)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: "Email already has a VendoFlow account" },
        { status: 409 }
      )
    }

    // Parse owner name into first/last
    const nameParts = (ownerName as string).trim().split(/\s+/)
    const firstName = nameParts[0] ?? ownerName
    const lastName  = nameParts.slice(1).join(" ") || ""

    // Period end: 30 days from now
    const periodEnd = new Date(Date.now() + 30 * 86_400_000).toISOString()

    // ── 2. Create Supabase Auth user ──────────────────────────────────────────
    const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email:         ownerEmail.trim(),
      email_confirm: true,
      user_metadata: {
        full_name: ownerName.trim(),
        is_owner:  true,
      },
    })

    if (authErr || !authData.user) {
      console.error("[create-account] Auth user creation failed:", authErr)
      return NextResponse.json(
        { error: `Failed to create auth user: ${authErr?.message ?? "Unknown"}` },
        { status: 500 }
      )
    }

    const authUserId = authData.user.id

    // ── 3. INSERT into public.accounts ────────────────────────────────────────
    const { data: account, error: accErr } = await supabaseAdmin
      .from("accounts")
      .insert({
        business_name:                   businessName.trim(),
        owner_email:                     ownerEmail.trim(),
        plan_tier:                       planTier,
        subscription_status:             planTier === "trial" ? "trial" : "active",
        subscription_current_period_end: periodEnd,
        next_payment_date:               periodEnd,
        subscription_started_at:         new Date().toISOString(),
        city:                            city?.trim() || null,
      })
      .select()
      .single()

    if (accErr || !account) {
      await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => {})
      console.error("[create-account] accounts insert failed:", accErr)
      return NextResponse.json({ error: "Failed to create account" }, { status: 500 })
    }

    const accountId: string = account.account_id

    // ── 4. INSERT into public.staff ───────────────────────────────────────────
    const { data: staff, error: staffErr } = await supabaseAdmin
      .from("staff")
      .insert({
        auth_user_id: authUserId,
        account_id:   accountId,
        first_name:   firstName,
        last_name:    lastName,
        email:        ownerEmail.trim(),
        phone:        ownerPhone?.trim() || null,
        role:         "owner",
        active:       true,
      })
      .select()
      .single()

    if (staffErr || !staff) {
      await supabaseAdmin.from("accounts").delete().eq("account_id", accountId).catch(() => {})
      await supabaseAdmin.auth.admin.deleteUser(authUserId).catch(() => {})
      console.error("[create-account] staff insert failed:", staffErr)
      return NextResponse.json({ error: "Failed to create staff record" }, { status: 500 })
    }

    // ── 5. INSERT into public.stores ──────────────────────────────────────────
    const finalStoreName = storeName?.trim() || `${businessName.trim()} Store`

    const { data: store, error: storeErr } = await supabaseAdmin
      .from("stores")
      .insert({
        account_id: accountId,
        name:       finalStoreName,
        active:     true,
      })
      .select()
      .single()

    if (storeErr) {
      console.error("[create-account] store insert failed (non-fatal):", storeErr)
    }

    // ── 6. Welcome WhatsApp (optional) ────────────────────────────────────────
    if (sendWelcomeWhatsapp && ownerPhone) {
      try {
        const cleanPhone = (ownerPhone as string).replace(/[^\d+]/g, "")

        // Create the WhatsApp conversation record
        const { data: conv } = await (adminDb().from("whatsapp_conversations") as any)
          .insert({
            merchant_id:     accountId,
            contact_phone:   cleanPhone,
            contact_name:    ownerName.trim(),
            status:          "open",
            last_message_at: new Date().toISOString(),
          })
          .select("id")
          .single()

        // Fire-and-forget welcome template message
        if (conv?.id) {
          fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/admin/whatsapp/send`, {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              conversationId: conv.id,
              type:           "template",
              templateName:   "onboarding_message",
              templateParams: { "1": ownerName.trim() },
            }),
          }).catch((e) => console.error("[create-account] welcome WA send failed:", e))
        }
      } catch (waErr) {
        console.error("[create-account] WhatsApp setup failed (non-fatal):", waErr)
      }
    }

    // ── 7. Activity log ───────────────────────────────────────────────────────
    await logActivity(adminUser, "account_created", "account", accountId, {
      business_name: businessName.trim(),
      owner_email:   ownerEmail.trim(),
      plan_tier:     planTier,
    })

    // ── 8. Return ─────────────────────────────────────────────────────────────
    return NextResponse.json({ account, staff, store: store ?? null }, { status: 201 })
  } catch (err: any) {
    console.error("[create-account] Error:", err)
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 })
  }
}
