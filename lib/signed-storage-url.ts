/**
 * Convert a Supabase storage public URL to a signed URL so it works for private buckets.
 * When buckets are private, getPublicUrl() returns a URL that returns 403 in the browser.
 * Signed URLs include a token and work for a limited time (e.g. 1 hour).
 */

import type { SupabaseClient } from "@supabase/supabase-js"

const PUBLIC_PATH = "/storage/v1/object/public/"

export function isSupabaseStorageUrl(url: string | null | undefined, baseUrl?: string): boolean {
  if (!url || typeof url !== "string" || !url.startsWith("http")) return false
  const base = baseUrl ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
  if (!base) return url.includes("/storage/v1/object/public/")
  try {
    const u = new URL(url)
    const b = new URL(base)
    return u.origin === b.origin && u.pathname.includes(PUBLIC_PATH)
  } catch {
    return false
  }
}

/**
 * Parse a Supabase storage public URL into bucket and path.
 * e.g. https://xxx.supabase.co/storage/v1/object/public/business-logos/account/file.jpg
 *   -> { bucket: 'business-logos', path: 'account/file.jpg' }
 */
export function parseSupabaseStorageUrl(
  publicUrl: string
): { bucket: string; path: string } | null {
  try {
    const url = new URL(publicUrl)
    const idx = url.pathname.indexOf(PUBLIC_PATH)
    if (idx === -1) return null
    const after = url.pathname.slice(idx + PUBLIC_PATH.length)
    const slash = after.indexOf("/")
    if (slash === -1) return null
    const bucket = after.slice(0, slash)
    const path = after.slice(slash + 1)
    return path ? { bucket, path } : null
  } catch {
    return null
  }
}

const SIGNED_EXPIRY_SECONDS = 60 * 60 // 1 hour

/**
 * If the URL is a Supabase storage public URL, return a signed URL; otherwise return the original.
 * Use this server-side when passing image URLs to the client so images load for private buckets.
 */
export async function getSignedStorageUrl(
  supabase: SupabaseClient,
  publicUrl: string | null | undefined
): Promise<string | null> {
  if (!publicUrl) return null
  const parsed = parseSupabaseStorageUrl(publicUrl)
  if (!parsed) return publicUrl

  const { data, error } = await supabase.storage
    .from(parsed.bucket)
    .createSignedUrl(parsed.path, SIGNED_EXPIRY_SECONDS)

  if (error || !data?.signedUrl) return publicUrl
  return data.signedUrl
}
