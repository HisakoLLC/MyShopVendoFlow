"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast, Toaster } from "sonner"
import { Check, X } from "lucide-react"

import { createClient } from "@/lib/supabase/client"

export const dynamic = "force-dynamic"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createAccountAfterSignup } from "./actions"

export default function SignupPage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  const [businessName, setBusinessName] = React.useState("")
  const [yourName, setYourName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)

  // Password strength checker
  const passwordStrength = React.useMemo(() => {
    if (!password) return { score: 0, checks: [] }
    
    const checks = [
      { label: "At least 8 characters", met: password.length >= 8 },
      { label: "One uppercase letter", met: /[A-Z]/.test(password) },
      { label: "One number", met: /[0-9]/.test(password) },
    ]
    
    const score = checks.filter((c) => c.met).length
    return { score, checks }
  }, [password])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!businessName.trim()) {
      toast.error("Business name is required")
      return
    }

    if (!yourName.trim()) {
      toast.error("Your name is required")
      return
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    if (passwordStrength.score < 3) {
      toast.error("Password does not meet strength requirements")
      return
    }

    setIsLoading(true)

    try {
      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        if (authError.message.includes("signup not allowed")) {
          toast.error(
            "Signup is disabled. Please enable it in Supabase Dashboard → Authentication → Settings."
          )
        } else {
          toast.error(authError.message)
        }
        return
      }

      if (!authData.user) {
        toast.error("Failed to create user account")
        return
      }

      // Always create account + account_members (uses service role, does not require session).
      // This way when email confirmation is required, the account exists after they confirm and log in.
      console.log("Calling createAccountAfterSignup with:", { userId: authData.user.id, businessName, email })
      try {
        const result = await createAccountAfterSignup(authData.user.id, businessName, email)
        if (!result?.account_id) {
          throw new Error("Account creation returned no account ID")
        }
      } catch (accountError) {
        console.error("Account creation error:", accountError)
        const errorMessage = accountError instanceof Error
          ? accountError.message
          : "Failed to create account. Please check your environment variables and try again."
        toast.error(errorMessage)
        setIsLoading(false)
        return
      }

      // If no session (e.g. email confirmation required), do not redirect; account is already created.
      if (!authData.session) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          toast.info("Please check your email to confirm your account. After confirming, log in and you’ll be taken to setup.")
          setIsLoading(false)
          return
        }
      }

      toast.success("Account created successfully! Redirecting to onboarding...")
      setTimeout(() => {
        router.push("/onboarding")
        router.refresh()
      }, 1500)
    } catch (err) {
      console.error("Signup error:", err)
      toast.error(err instanceof Error ? err.message : "Failed to create account")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-light px-4 py-12 dark:bg-background-dark">
      <Toaster richColors position="top-right" />
      <div className="w-full max-w-md space-y-8 rounded-xl border border-zinc-200 bg-background-card-light p-8 shadow-lg dark:border-border-dark dark:bg-background-card-dark">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            VendoFlow
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Create your account to get started
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="businessName">Business Name *</Label>
            <Input
              id="businessName"
              type="text"
              placeholder="What's your boutique called?"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              required
              disabled={isLoading}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="yourName">Your Name *</Label>
            <Input
              id="yourName"
              type="text"
              placeholder="John Doe"
              value={yourName}
              onChange={(e) => setYourName(e.target.value)}
              required
              disabled={isLoading}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
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
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              This will be your owner email
            </p>
          </div>

          <div>
            <Label htmlFor="password">Password *</Label>
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
            {password && (
              <div className="mt-2 space-y-1">
                <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Password strength:
                </div>
                {passwordStrength.checks.map((check, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    {check.met ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <X className="h-3 w-3 text-zinc-400" />
                    )}
                    <span
                      className={
                        check.met
                          ? "text-green-600 dark:text-green-400"
                          : "text-zinc-500 dark:text-zinc-400"
                      }
                    >
                      {check.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              className="mt-1"
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                Passwords do not match
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || passwordStrength.score < 3}>
            {isLoading ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <div className="text-center text-sm text-zinc-600 dark:text-zinc-400">
          <p>
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
