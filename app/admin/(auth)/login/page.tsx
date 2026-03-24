"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase"

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

    const supabase = getSupabaseBrowserClient()
    if (!supabase) {
      setError("Unable to connect. Please refresh and try again.")
      setLoading(false)
      return
    }

    // 1. Sign in with Supabase auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !authData.user) {
      setError(authError?.message ?? "Invalid email or password.")
      setLoading(false)
      return
    }

    // 2. Verify user exists in admin.admin_users and is_active = true via Server Action
    // This avoids schema exposure issues in the browser client
    const { verifyAdminAccess } = await import("./actions")
    const { success, error: verifyError } = await verifyAdminAccess(authData.user.id)

    if (!success) {
      // Not an admin — sign them out immediately and show error
      await supabase.auth.signOut()
      setError(verifyError || "Your account does not have admin access.")
      setLoading(false)
      return
    }

    // 3. Success — go to admin dashboard
    router.push("/admin/dashboard")
    router.refresh()
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "384px",
          backgroundColor: "#111111",
          border: "1px solid #1f1f1f",
          borderRadius: "12px",
          padding: "2rem",
        }}
      >
        {/* Logo area */}
        <div style={{ marginBottom: "1.5rem" }}>
          <p
            style={{
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "1.25rem",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            VendoFlow
          </p>
          <p
            style={{
              color: "#666666",
              fontSize: "0.65rem",
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              margin: "0.35rem 0 0 0",
            }}
          >
            Admin Console
          </p>
        </div>

        {/* Divider */}
        <div
          style={{
            height: "1px",
            backgroundColor: "#1f1f1f",
            marginBottom: "1.75rem",
          }}
        />

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Email */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label
              htmlFor="admin-email"
              style={{ color: "#999999", fontSize: "0.75rem", fontWeight: 500 }}
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
              style={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #2a2a2a",
                borderRadius: "6px",
                color: "#ffffff",
                fontSize: "0.875rem",
                padding: "0.625rem 0.75rem",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#3a3a3a")}
              onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
            />
          </div>

          {/* Password */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <label
              htmlFor="admin-password"
              style={{ color: "#999999", fontSize: "0.75rem", fontWeight: 500 }}
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
              style={{
                backgroundColor: "#1a1a1a",
                border: "1px solid #2a2a2a",
                borderRadius: "6px",
                color: "#ffffff",
                fontSize: "0.875rem",
                padding: "0.625rem 0.75rem",
                outline: "none",
                width: "100%",
                boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#3a3a3a")}
              onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
            />
          </div>

          {/* Submit */}
          <button
            id="admin-signin-btn"
            type="submit"
            disabled={loading}
            style={{
              marginTop: "0.25rem",
              width: "100%",
              backgroundColor: loading ? "#16a34a" : "#22c55e",
              color: "#000000",
              fontWeight: 600,
              fontSize: "0.875rem",
              padding: "0.65rem",
              border: "none",
              borderRadius: "6px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.8 : 1,
              transition: "background-color 0.15s, opacity 0.15s",
            }}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          {/* Inline error */}
          {error && (
            <p
              style={{
                color: "#f87171",
                fontSize: "0.8rem",
                margin: 0,
                textAlign: "center",
                lineHeight: 1.4,
              }}
            >
              {error}
            </p>
          )}

          {/* Disclaimer */}
          <p
            style={{
              color: "#444444",
              fontSize: "0.7rem",
              textAlign: "center",
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Admin access only. Unauthorized access is prohibited.
          </p>
        </form>
      </div>
    </div>
  )
}
