export const PERMISSIONS = {
  // Dashboard: everyone
  dashboard: ['super_admin', 'support', 'finance', 'reporting'],
  
  // Merchants: everyone can view, only super_admin can see financial details
  merchants_view: ['super_admin', 'support', 'finance', 'reporting'],
  merchants_financial: ['super_admin', 'finance'],
  
  // WhatsApp: support and super_admin
  whatsapp_view: ['super_admin', 'support'],
  whatsapp_send: ['super_admin', 'support'],
  
  // Reports: all can view, only reporting and super_admin can approve
  reports_view: ['super_admin', 'support', 'finance', 'reporting'],
  reports_approve: ['super_admin', 'reporting'],
  reports_send: ['super_admin', 'reporting'],
  reports_generate: ['super_admin', 'reporting', 'finance'],
  
  // Finance: only finance and super_admin
  finance_view: ['super_admin', 'finance'],
  
  // Staff: only super_admin
  staff_manage: ['super_admin'],
  
  // Settings: only super_admin
  settings_manage: ['super_admin'],
  
  // Custom Merchant Actions
  merchants_create: ['super_admin'],
} as const

export type Permission = keyof typeof PERMISSIONS

export function hasPermission(role: string, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly string[]).includes(role)
}
