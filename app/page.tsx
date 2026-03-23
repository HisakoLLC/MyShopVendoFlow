import { redirect } from "next/navigation"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    // If there's an error or no user, redirect to login
    if (error || !user) {
      redirect("/login")
    } else {
      redirect("/dashboard")
    }
  } catch (error) {
    // If Supabase client creation fails (e.g., missing env vars), redirect to login
    // The login page will show appropriate error messages
    console.error("Error initializing Supabase client:", error)
    redirect("/login")
  }
}
