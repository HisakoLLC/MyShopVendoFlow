/**
 * Role-based access for staff (cashier, manager, owner).
 * Owners via account_members are treated as full access.
 */

export type StaffRole = "cashier" | "manager" | "owner"

/** Paths allowed per role. Owner has full access (no list = all). */
const ROLE_PATHS: Record<StaffRole, string[]> = {
  cashier: ["/dashboard", "/pos"],
  manager: ["/dashboard", "/pos", "/sales", "/products", "/inventory", "/customers"],
  owner: [], // empty = all paths allowed
}

/**
 * Resolve effective role for the current user (client-side helper).
 * Note: This is a simplified check for UI purposes. Real role enforcement happens
 * server-side in middleware which queries the database.
 * 
 * - Staff (user_metadata.is_staff): return "cashier" as safe default (real role from DB)
 * - Owner (no is_staff): treat as "owner" (full access)
 */
export function getRoleFromUser(user: { user_metadata?: Record<string, unknown> } | null): StaffRole {
  if (!user?.user_metadata) return "owner"
  
  // Check if user is staff (has is_staff metadata)
  const isStaff = user.user_metadata.is_staff === true
  
  if (isStaff) {
    // Staff user: return cashier as safe default
    // Real role is checked server-side from database
    // This is just for client-side UI filtering
    return "cashier"
  }
  
  // Not staff = account owner
  return "owner"
}

/**
 * Check if the role is allowed to access the path.
 * Owner can access everything. Others only listed paths.
 */
export function canAccessPath(pathname: string, role: StaffRole): boolean {
  if (role === "owner") return true
  const allowed = ROLE_PATHS[role]
  return allowed.some((p) => pathname === p || pathname.startsWith(p + "/"))
}

/**
 * Nav items that each role can see (by href).
 * Used by AppShell to filter sidebar.
 */
const ROLE_NAV_HREFS: Record<StaffRole, string[]> = {
  cashier: ["/dashboard", "/pos"],
  manager: ["/dashboard", "/pos", "/sales", "/products", "/inventory", "/customers"],
  owner: [], // empty = show all
}

export function canShowNavItem(href: string, role: StaffRole): boolean {
  if (role === "owner") return true
  const allowed = ROLE_NAV_HREFS[role]
  return allowed.some((p) => p === href)
}

export function getRoleLabel(role: StaffRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1)
}
