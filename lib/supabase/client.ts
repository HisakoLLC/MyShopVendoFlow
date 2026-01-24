import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your Vercel project settings.'
    )
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
}