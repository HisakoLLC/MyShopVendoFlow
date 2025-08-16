import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"

// Create a singleton client for the browser
let browserClientInstance: ReturnType<typeof createClient<Database>> | null = null

export function getSupabaseBrowserClient() {
  if (!browserClientInstance && typeof window !== "undefined") {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase environment variables for browser client")
      return null
    }

    try {
      browserClientInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          storageKey: "vendaflow-auth",
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "implicit",
        },
      })
    } catch (error) {
      console.error("Error creating Supabase browser client:", error)
      return null
    }
  }
  return browserClientInstance
}

// Create a server client with the service role key
// This should ONLY be used in server components or server actions
export function getSupabaseServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase environment variables for server client")
    return null
  }

  try {
    return createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  } catch (error) {
    console.error("Error creating Supabase server client:", error)
    return null
  }
}
