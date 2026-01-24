"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast, Toaster } from "sonner"

import { createClient } from "@/lib/supabase/client"

export const dynamic = "force-dynamic"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

export default function LoginPage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [rememberMe, setRememberMe] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [isResetting, setIsResetting] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error("Invalid email or password")
        return
      }

      if (data.user) {
        // Check if user has completed onboarding (has account_members record)
        const { data: accountMember, error: memberError } = await supabase
          .from("account_members")
          .select("account_id")
          .eq("user_id", data.user.id)
          .single()

        if (memberError || !accountMember) {
          // No account linked, redirect to onboarding
          router.push("/onboarding")
        } else {
          // Account exists, redirect to dashboard
          router.push("/dashboard")
        }
        router.refresh()
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sign in")
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Please enter your email address first")
      return
    }

    setIsResetting(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        toast.error(error.message)
      } else {
        toast.success("Password reset email sent! Check your inbox.")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send reset email")
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <Toaster richColors position="top-right" />
      <div className="w-full max-w-md space-y-8 rounded-xl border border-zinc-200 bg-white p-8 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            VendoFlow
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="mt-1"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
                disabled={isLoading}
              />
              <Label
                htmlFor="remember"
                className="text-sm font-normal cursor-pointer"
              >
                Remember me
              </Label>
            </div>
            <button
              type="button"
              onClick={handleForgotPassword}
              disabled={isLoading || isResetting}
              className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {isResetting ? "Sending..." : "Forgot password?"}
            </button>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in..." : "Login"}
          </Button>
        </form>

        <div className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            Don't have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
