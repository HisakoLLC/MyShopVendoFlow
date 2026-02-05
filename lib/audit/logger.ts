import { createClient } from '@supabase/supabase-js'
import { getSupabaseUrl } from '@/lib/supabase/env'

// Use service role for audit logging (bypasses RLS)
const getSupabaseAdmin = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY
  const supabaseUrl = getSupabaseUrl()
  
  if (!serviceRoleKey || !supabaseUrl) {
    console.error('Missing Supabase service role key or URL for audit logging')
    return null
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

export interface AuditLogParams {
  account_id: string
  user_id?: string
  staff_id?: string
  action_type: string
  entity_type?: string
  entity_id?: string
  old_values?: Record<string, any>
  new_values?: Record<string, any>
  ip_address?: string | null
  user_agent?: string | null
  metadata?: Record<string, any>
}

/**
 * Log an action to the audit logs table
 * This function never throws - logging failures are logged to console
 * If the audit_logs table doesn't exist, it fails silently
 */
export async function logAuditEvent(params: AuditLogParams): Promise<void> {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    if (!supabaseAdmin) {
      // Silently fail if admin client not available (e.g. missing env vars)
      return
    }

    const { error } = await supabaseAdmin.from('audit_logs').insert({
      account_id: params.account_id,
      user_id: params.user_id || null,
      staff_id: params.staff_id || null,
      action_type: params.action_type,
      entity_type: params.entity_type || null,
      entity_id: params.entity_id || null,
      old_values: params.old_values || null,
      new_values: params.new_values || null,
      ip_address: params.ip_address || null,
      user_agent: params.user_agent || null,
      metadata: params.metadata || null,
    })

    if (error) {
      // Log error but don't throw - audit logging failures shouldn't break functionality
      // Common errors: table doesn't exist (42P01), permission denied, etc.
      if (error.code === '42P01') {
        // Table doesn't exist - user needs to run migration
        console.warn('Audit logs table does not exist. Run sql/CREATE_AUDIT_LOGS_TABLE.sql')
      } else {
        console.error('Audit log error:', error.message, error.code)
      }
    }
  } catch (err) {
    // Never throw - logging shouldn't break app functionality
    // This catches any unexpected errors (network, parsing, etc.)
    console.error('Audit log exception:', err instanceof Error ? err.message : String(err))
  }
}

// Helper function to get IP address from request
export function getIpAddress(request: Request): string | null {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    null
  )
}

// Helper function to get user agent
export function getUserAgent(request: Request): string | null {
  return request.headers.get('user-agent') || null
}
