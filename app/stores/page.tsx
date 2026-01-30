import { redirect } from "next/navigation"

/**
 * /stores redirects to settings (single-store app; store management is in a separate portal).
 */
export default function StoresPage() {
  redirect("/settings")
}
