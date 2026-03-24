"use client"

import { ReactNode } from "react"
import { useAdminUser } from "@/lib/admin/AdminUserContext"
import { Permission, hasPermission } from "@/lib/admin/permissions"

interface PermissionGateProps {
  permission: Permission
  fallback?: ReactNode
  children: ReactNode
}

export default function PermissionGate({ 
  permission, 
  fallback = null, 
  children 
}: PermissionGateProps) {
  const { role } = useAdminUser()

  if (!role || !hasPermission(role, permission)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
