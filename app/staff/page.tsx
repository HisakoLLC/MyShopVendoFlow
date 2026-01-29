import { redirect } from "next/navigation"

/**
 * /staff redirects to the staff management page under Settings.
 */
export default function StaffPage() {
  redirect("/settings/staff")
}
