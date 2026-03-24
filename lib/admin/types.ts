// Admin TypeScript types — populated as admin features are built

export type AdminUser = {
  id: string
  email: string
  role: "superadmin" | "support"
}
