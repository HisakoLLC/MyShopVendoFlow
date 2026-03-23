"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast, Toaster } from "sonner"
import { Check, X } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createAccountAfterSignup } from "./actions"
import { AuthImageRotation } from "@/components/auth/AuthImageRotation"

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

    if (!businessName.trim() || !yourName.trim()) {
      toast.error("All fields are required")
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
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        toast.error(authError.message)
        setIsLoading(false)
        return
      }

      if (!authData.user) {
        toast.error("Failed to create user account")
        setIsLoading(false)
        return
      }

      try {
        const result = await createAccountAfterSignup(authData.user.id, businessName, email)
        if (!result?.account_id) {
          throw new Error("Account creation failed")
        }
      } catch (accountError: any) {
        toast.error(accountError.message)
        setIsLoading(false)
        return
      }

      if (!authData.session) {
        await new Promise((resolve) => setTimeout(resolve, 500))
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          toast.info("Check your email to confirm your account.")
          setIsLoading(false)
          return
        }
      }

      toast.success("Account created successfully!")
      setTimeout(() => {
        router.push("/onboarding")
        router.refresh()
      }, 1500)
    } catch (err: any) {
      toast.error(err.message || "Failed to create account")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-black overflow-hidden font-sans">
      <Toaster richColors position="top-right" />
      
      {/* Form Side */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-10 text-center lg:text-left">
            <h1 className="font-editorial text-4xl font-bold tracking-tight text-white mb-2 underline decoration-zinc-800 decoration-4 underline-offset-8">
              VendoFlow
            </h1>
            <h2 className="text-xl font-medium text-zinc-100 mt-6 capitalize">
              Join the future of fashion.
            </h2>
            <p className="mt-2 text-sm text-zinc-500">
              Create your account to start managing your boutique with precision.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessName" className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-500">Business Name</Label>
                <Input
                  id="businessName"
                  placeholder="Boutique Name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-zinc-900 border-zinc-800 text-white h-11 focus-visible:ring-zinc-600 rounded-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yourName" className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-500">Your Name</Label>
                <Input
                  id="yourName"
                  placeholder="John Doe"
                  value={yourName}
                  onChange={(e) => setYourName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-zinc-900 border-zinc-800 text-white h-11 focus-visible:ring-zinc-600 rounded-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-500">Owner Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@boutique.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="bg-zinc-900 border-zinc-800 text-white h-11 focus-visible:ring-zinc-600 rounded-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-500">Create Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="bg-zinc-900 border-zinc-800 text-white h-11 focus-visible:ring-zinc-600 rounded-sm"
              />
              {password && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                    {passwordStrength.checks.map((check, idx) => (
                      <div key={idx} className="flex flex-col gap-1 items-center">
                        <div className={`h-1 w-full rounded-full ${check.met ? "bg-white" : "bg-zinc-800"}`} />
                        <span className="text-[0.5rem] uppercase tracking-tighter text-zinc-500">{check.label.split(' ')[2] || 'Length'}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-500">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                className={`bg-zinc-900 border-zinc-800 text-white h-11 focus-visible:ring-zinc-600 rounded-sm ${
                  confirmPassword && password !== confirmPassword ? "border-red-900/50" : ""
                }`}
              />
            </div>

            <Button type="submit" className="w-full h-11 bg-white text-black hover:bg-zinc-200 transition-all rounded-sm font-semibold uppercase tracking-wider text-xs mt-4" disabled={isLoading || passwordStrength.score < 3}>
              {isLoading ? "Provisioning Account..." : "Create Account"}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-800 text-center lg:text-left">
            <p className="text-sm text-zinc-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-bold text-white hover:underline underline-offset-4"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Image Side */}
      <div className="relative hidden w-0 flex-1 lg:block p-6">
        <AuthImageRotation />
      </div>
    </div>
  )
}
