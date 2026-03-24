"use client"

import { createContext, useContext } from "react"

export type AdminUser = {
  id: string
  email: string
  full_name: string
  role: "super_admin" | "support" | "finance" | "reporting"
  avatar_url: string | null
}

const AdminUserContext = createContext<AdminUser | null>(null)

export function AdminUserProvider({
  value,
  children,
}: {
  value: AdminUser
  children: React.ReactNode
}) {
  return (
    <AdminUserContext.Provider value={value}>
      {children}
    </AdminUserContext.Provider>
  )
}

export function useAdminUser(): AdminUser {
  const ctx = useContext(AdminUserContext)
  if (!ctx) {
    throw new Error("useAdminUser must be used within AdminUserProvider")
  }
  return ctx
}
