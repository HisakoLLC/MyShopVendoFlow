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

  React.useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.user) {
        router.push("/dashboard");
      }
    }
    checkSession();
    return () => { cancelled = true; };
  }, [supabase, router]);

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
    <div className="flex min-h-screen bg-zinc-950">
      <Toaster richColors position="top-right" />

      {/* Left form panel */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center px-8 py-12 overflow-y-auto">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="font-editorial text-2xl font-bold text-zinc-50 mb-8">
              VendoFlow
            </h1>
            <h2 className="font-editorial text-3xl font-bold text-zinc-50 mb-2">
              Join The Future Of Fashion Tech.
            </h2>
            <p className="text-sm text-zinc-500 mb-8">
              Create your account to start managing your boutique with precision.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessName" className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2 block">Business Name</Label>
                <Input
                  id="businessName"
                  placeholder="Boutique Name"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 h-11 px-4 w-full placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yourName" className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2 block">Your Name</Label>
                <Input
                  id="yourName"
                  placeholder="John Doe"
                  value={yourName}
                  onChange={(e) => setYourName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 h-11 px-4 w-full placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2 block">Owner Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@boutique.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 h-11 px-4 w-full placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2 block">Create Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 h-11 px-4 w-full placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600"
              />
              {password && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {passwordStrength.checks.map((check, idx) => (
                    <div key={idx} className="flex flex-col gap-1">
                      <div className={`h-1 rounded-full transition-colors ${check.met
                          ? passwordStrength.score === 1 ? "bg-red-400"
                            : passwordStrength.score === 2 ? "bg-amber-400"
                              : "bg-emerald-400"
                          : "bg-zinc-800"
                        }`} />
                      <span className="text-[0.6rem] font-semibold tracking-[0.1em] uppercase text-zinc-600 mt-1">
                        {idx === 0 ? "8" : idx === 1 ? "Letter" : "Length"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2 block">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                className={`bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100 h-11 px-4 w-full placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600 ${confirmPassword && password !== confirmPassword ? "border-red-900/50" : ""
                  }`}
              />
            </div>

            <Button type="submit" className="bg-white text-zinc-950 hover:bg-zinc-100 rounded-sm h-11 w-full text-xs font-semibold tracking-[0.15em] uppercase mt-4" disabled={isLoading || passwordStrength.score < 3}>
              {isLoading ? "Provisioning Account..." : "Create Account"}
            </Button>
          </form>

          <div className="w-full h-px bg-zinc-800 my-6" />

          <div className="text-center lg:text-left">
            <p className="text-sm text-zinc-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-sm font-semibold text-zinc-100 hover:text-white"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right image panel */}
      <div className="hidden lg:block lg:w-1/2 h-screen sticky top-0 rounded-[2rem] overflow-hidden m-3">
        <AuthImageRotation />
      </div>
    </div>
  )
}
