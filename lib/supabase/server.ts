import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/database'
import { getSupabaseUrl, getSupabaseAnonKey } from './env'

export async function createServerSupabaseClient() {
  const supabaseUrl = getSupabaseUrl()
  const supabaseAnonKey = getSupabaseAnonKey()

  if (!supabaseUrl || !supabaseAnonKey) {
    // During build time, Next.js analyzes code even for dynamic pages
    // Return a mock client that will fail gracefully at runtime
    // This prevents build failures while still showing errors at runtime
    const mockError = { message: 'Missing Supabase env. In Vercel add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_SUPABASE_URL and SUPABASE_ANON_KEY). Redeploy after saving.' }
    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: mockError }),
      },
      from: () => ({
        select: () => ({ 
          eq: () => ({ 
            single: () => Promise.resolve({ data: null, error: mockError }),
            order: () => ({ data: [], error: mockError }),
          }),
          in: () => ({ eq: () => ({ data: [], error: mockError }) }),
        }),
      }),
      rpc: () => Promise.resolve({ data: null, error: mockError }),
    } as any
  }

  const cookieStore = await cookies()

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set(name, value, options)
          } catch (error) {
            // Cookie setting might fail in some contexts (e.g., during redirects)
            // This is okay - the cookie will be set on the next request
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set(name, '', { ...options, maxAge: 0 })
          } catch (error) {
            // Cookie removal might fail in some contexts
          }
        },
      },
    }
  )
}
