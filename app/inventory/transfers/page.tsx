import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default function TransfersPage() {
  redirect("/inventory/transfer")
}
