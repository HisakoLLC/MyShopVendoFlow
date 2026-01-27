import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'
import { getSupabaseUrl, getSupabaseAnonKey } from './env'

const CONFIG_ERROR_MESSAGE =
  'Missing Supabase config. In Vercel: Settings → Environment Variables, add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (use the same values as your Supabase URL and anon key). Redeploy after saving.'

export function createClient() {
  // Only create client in browser environment
  // During build/server-side, this should not be called, but we handle it gracefully
  if (typeof window === 'undefined') {
    // This should never happen in a client component, but if it does during build analysis,
    // we return a minimal mock to prevent build errors
    // The actual client will be created when this runs in the browser
    return {
      auth: {
        signInWithPassword: () => Promise.resolve({ data: null, error: { message: 'Client not initialized' } }),
        resetPasswordForEmail: () => Promise.resolve({ error: { message: 'Client not initialized' } }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: { message: 'Client not initialized' } }) }) }),
      }),
    } as any
  }

  const supabaseUrl = getSupabaseUrl()
  const supabaseAnonKey = getSupabaseAnonKey()

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(CONFIG_ERROR_MESSAGE)
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}