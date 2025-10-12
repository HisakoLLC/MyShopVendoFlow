import type { Metadata } from "next"
import LoginPageClient from "./client-page"

export const metadata: Metadata = {
  title: "Login | VendoFlow",
}

export default function LoginPage() {
  return <LoginPageClient />
}
