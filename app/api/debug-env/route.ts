import { NextResponse } from "next/server"

export async function GET() {
  // Create a safe version of the environment variables without exposing actual values
  const safeEnv = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    // Add other environment variables you want to check
  }

  return NextResponse.json({
    message: "Environment variables check",
    variables: safeEnv,
  })
}
