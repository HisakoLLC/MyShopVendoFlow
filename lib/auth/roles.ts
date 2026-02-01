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
 * Resolve effective role for the current user.
 * - Staff (user_metadata.staff_id): use user_metadata.role (cashier | manager | owner).
 * - Owner (account_members, no staff_id): treat as "owner" (full access).
 */
export function getRoleFromUser(user: { user_metadata?: Record<string, unknown> } | null): StaffRole {
  if (!user?.user_metadata) return "owner"
  const staffId = user.user_metadata.staff_id
  const role = user.user_metadata.role as StaffRole | undefined
  if (staffId && role && (role === "cashier" || role === "manager" || role === "owner")) {
    return role
  }
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
