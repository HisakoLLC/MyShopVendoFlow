import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/database"
import { getSupabaseUrl, getSupabaseServiceRoleKey } from "@/lib/supabase/env"

/**
 * Admin-scoped Supabase client using the service role key.
 * This client bypasses Row Level Security — use only in server-side admin contexts.
 * Never expose this client or the service role key to the browser.
 */
export const supabaseAdmin = createClient<Database>(
  getSupabaseUrl()!,
  getSupabaseServiceRoleKey()!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
