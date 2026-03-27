import { NextRequest, NextResponse } from "next/server"
import { getServerAdminUser } from "@/lib/admin/auth"
import { supabaseAdmin } from "@/lib/admin/supabase-admin"
import { v4 as uuidv4 } from "uuid"
import { Buffer } from "buffer"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const adminUser = await getServerAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 })
    }

    // Basic size validation (e.g., 5MB for WhatsApp)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "File size too large. Max 5MB." }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin"
    const filePath = `${adminUser.id}/${uuidv4()}.${ext}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from("whatsapp-media")
      .upload(filePath, buffer, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      return NextResponse.json({ error: `Upload failed: ${uploadError.message}` }, { status: 500 })
    }

    const { data: publicData } = supabaseAdmin.storage.from("whatsapp-media").getPublicUrl(filePath)
    const mediaUrl = publicData.publicUrl

    return NextResponse.json({ 
      media_url: mediaUrl,
      file_name: file.name,
      mime_type: file.type,
      file_size: file.size
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to upload file"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
