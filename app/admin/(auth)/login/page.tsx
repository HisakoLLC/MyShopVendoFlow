"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signInAdmin } from "./actions"

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Call the custom server action that bypasses broken GoTrue service
    const result = await signInAdmin(email, password)
    
    if (!result.success) {
      setError(result.error || "Invalid email or password.")
      setLoading(false)
      return
    }

    // 3. Success — redirect to merchants page
    router.push("/admin/merchants")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-card border border-border rounded-lg p-8 shadow-sm">
        {/* Logo area */}
        <div className="mb-6">
          <p className="text-foreground font-bold text-xl tracking-tight m-0 leading-tight">
            VendoFlow
          </p>
          <p className="text-muted-foreground text-[0.65rem] font-semibold tracking-[0.15em] uppercase mt-1 m-0">
            Admin Console
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-border mb-7" />

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="admin-email"
              className="text-muted-foreground text-xs font-semibold uppercase tracking-wider"
            >
              Email
            </label>
            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@vendoflow.com"
              className="bg-background border border-border rounded-md text-sm text-foreground px-3 py-2.5 outline-none w-full placeholder:text-muted-foreground/50 focus:border-[#E8400C] focus:ring-1 focus:ring-[#E8400C]/30 transition-all"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="admin-password"
              className="text-muted-foreground text-xs font-semibold uppercase tracking-wider"
            >
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="bg-background border border-border rounded-md text-sm text-foreground px-3 py-2.5 outline-none w-full placeholder:text-muted-foreground/50 focus:border-[#E8400C] focus:ring-1 focus:ring-[#E8400C]/30 transition-all"
            />
          </div>

          {/* Submit */}
          <button
            id="admin-signin-btn"
            type="submit"
            disabled={loading}
            className="mt-1 w-full bg-[#E8400C] hover:bg-[#c73508] disabled:opacity-50 text-white font-semibold text-sm py-2.5 px-4 rounded-md shadow-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          {/* Inline error */}
          {error && (
            <p className="text-destructive text-xs font-semibold m-0 text-center leading-relaxed">
              {error}
            </p>
          )}

          {/* Disclaimer */}
          <p className="text-muted-foreground/60 text-[0.7rem] text-center m-0 leading-relaxed pt-2">
            Admin access only. Unauthorized access is prohibited.
          </p>
        </form>
      </div>
    </div>
  )
}
