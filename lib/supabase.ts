import { createClient } from "@supabase/supabase-js"
import type { Database } from "../types/database.ts"
import { getSupabaseUrl, getSupabaseAnonKey } from "./supabase/env"

// Create a singleton client for the browser
let browserClientInstance: ReturnType<typeof createClient<Database>> | null = null

export function getSupabaseBrowserClient() {
  if (!browserClientInstance && typeof window !== "undefined") {
    const supabaseUrl = getSupabaseUrl()
    const supabaseAnonKey = getSupabaseAnonKey()

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase environment variables for browser client")
      return null
    }

    try {
      browserClientInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          storageKey: "vendoflow-auth",
          autoRefreshToken: true,
          detectSessionInUrl: true,
          // Prefer PKCE for browser auth flows.
          flowType: "pkce",
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
  if (typeof window !== "undefined") {
    console.error("getSupabaseServerClient was called in the browser")
    return null
  }

  const supabaseUrl = getSupabaseUrl()
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
