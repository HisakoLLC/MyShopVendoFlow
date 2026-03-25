/**
 * Supabase env vars with fallbacks for Vercel/Supabase integration naming.
 * Use these everywhere so both "NEXT_PUBLIC_SUPABASE_*" and "SUPABASE_*" names work.
 * Client bundle only gets NEXT_PUBLIC_* inlined; server has access to all.
 */
export function getSupabaseUrl(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_SUPABASE_URL
  )
}

export function getSupabaseAnonKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY
  )
}

export function getSupabaseServiceRoleKey(): string | undefined {
  // Never prefix this with NEXT_PUBLIC_ as it must stay server-side only.
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    process.env.SERVICE_ROLE_KEY
  )
}
