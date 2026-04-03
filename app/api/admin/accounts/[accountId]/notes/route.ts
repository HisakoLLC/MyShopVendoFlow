import { NextResponse } from "next/server"
import { requireAdmin, adminDb, logActivity } from "@/lib/admin/billing-helpers"

export const dynamic = "force-dynamic"

// ── POST /api/admin/accounts/[accountId]/notes ────────────────────────────────
// Body: { content, is_pinned? }
export async function POST(
  req: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { adminUser, errorResponse } = await requireAdmin()
    if (errorResponse) return errorResponse

    const { accountId } = await params
    const { content, is_pinned } = await req.json()

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "content is required" }, { status: 400 })
    }

    const { data: note, error: insertErr } = await (adminDb().from("account_notes") as any)
      .insert({
        account_id:  accountId,
        content:     content.trim(),
        is_pinned:   is_pinned ?? false,
        created_by:  adminUser.id,
      })
      .select()
      .single()

    if (insertErr) {
      console.error("[notes POST] Insert failed:", insertErr)
      return NextResponse.json({ error: "Failed to create note" }, { status: 500 })
    }

    await logActivity(adminUser, "note_added", "account", accountId, {
      note_id:   note.id,
      is_pinned: note.is_pinned,
    })

    return NextResponse.json({ note }, { status: 201 })
  } catch (err: any) {
    console.error("[notes POST] Error:", err)
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 })
  }
}

// ── PATCH /api/admin/accounts/[accountId]/notes ───────────────────────────────
// Query: ?noteId=<uuid>
// Body: { content?, is_pinned? }
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { adminUser, errorResponse } = await requireAdmin()
    if (errorResponse) return errorResponse

    const { accountId } = await params
    const noteId = new URL(req.url).searchParams.get("noteId")

    if (!noteId) {
      return NextResponse.json({ error: "Missing noteId query param" }, { status: 400 })
    }

    const { content, is_pinned } = await req.json()

    const updateData: Record<string, unknown> = {}
    if (content !== undefined) updateData.content = content.trim()
    if (is_pinned !== undefined) updateData.is_pinned = is_pinned

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    const { data: note, error: updateErr } = await (adminDb().from("account_notes") as any)
      .update(updateData)
      .eq("id", noteId)
      .eq("account_id", accountId) // ownership check
      .select()
      .single()

    if (updateErr) {
      console.error("[notes PATCH] Update failed:", updateErr)
      return NextResponse.json({ error: "Failed to update note" }, { status: 500 })
    }

    await logActivity(adminUser, "note_updated", "account", accountId, {
      note_id:   noteId,
      changes:   updateData,
    })

    return NextResponse.json({ note })
  } catch (err: any) {
    console.error("[notes PATCH] Error:", err)
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 })
  }
}

// ── DELETE /api/admin/accounts/[accountId]/notes ──────────────────────────────
// Query: ?noteId=<uuid>
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const { adminUser, errorResponse } = await requireAdmin()
    if (errorResponse) return errorResponse

    const { accountId } = await params
    const noteId = new URL(req.url).searchParams.get("noteId")

    if (!noteId) {
      return NextResponse.json({ error: "Missing noteId query param" }, { status: 400 })
    }

    const { error: deleteErr } = await (adminDb().from("account_notes") as any)
      .delete()
      .eq("id", noteId)
      .eq("account_id", accountId) // ownership check

    if (deleteErr) {
      console.error("[notes DELETE] Failed:", deleteErr)
      return NextResponse.json({ error: "Failed to delete note" }, { status: 500 })
    }

    await logActivity(adminUser, "note_deleted", "account", accountId, { note_id: noteId })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[notes DELETE] Error:", err)
    return NextResponse.json({ error: err.message ?? "Internal server error" }, { status: 500 })
  }
}
