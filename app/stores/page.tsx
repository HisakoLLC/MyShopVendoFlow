import { redirect } from "next/navigation"

/**
 * /stores redirects to the stores management page under Settings.
 */
export default function StoresPage() {
  redirect("/settings/stores")
}
