"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, ShoppingBag, AlertCircle } from "lucide-react"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import { useRouter, useSearchParams } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function LoginPageClient() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { signIn, user, isLoading } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirectTo") || "/dashboard"
  const reason = searchParams.get("reason")
  const [loginError, setLoginError] = useState<string | null>(null)

  useEffect(() => {
    document.title = "Login | VendoFlow"
  }, [])

  useEffect(() => {
    if (!isLoading && user) {
      console.log("User already logged in, redirecting to:", redirectTo)
      router.push(redirectTo)
    }
  }, [user, router, redirectTo, isLoading])

  const getReasonMessage = () => {
    switch (reason) {
      case "session_expired":
        return "Your session has expired. Please log in again."
      case "session_timeout":
        return "Your session timed out due to inactivity. Please log in again."
      case "unauthorized":
        return "Please log in to access that page."
      default:
        return null
    }
  }

  const reasonMessage = getReasonMessage()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setLoginError(null)

    try {
      console.log("Login form submitted with email:", email)
      const { error } = await signIn(email, password)

      if (error) {
        console.error("Login error:", error.message || "Unknown error")
        setLoginError(error.message || "Please check your credentials and try again.")
        toast({
          title: "Login failed",
          description: error.message || "Please check your credentials and try again.",
          variant: "destructive",
        })
      } else {
        console.log("Login successful, redirecting to:", redirectTo)
        toast({
          title: "Login successful",
          description: "Welcome back!",
        })
      }
    } catch (error: any) {
      console.error("Unexpected login error:", error)
      setLoginError(error?.message || "An unexpected error occurred. Please try again.")
      toast({
        title: "Login failed",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center gap-2">
            <ShoppingBag className="h-6 w-6 text-lime-500" />
            <CardTitle className="text-2xl font-bold text-center">VendoFlow</CardTitle>
          </div>
          <CardDescription className="text-center">Enter your credentials to sign in</CardDescription>
          {redirectTo !== "/dashboard" && (
            <p className="text-center text-sm text-muted-foreground">
              You'll be redirected to your requested page after login
            </p>
          )}
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {reasonMessage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Authentication Required</AlertTitle>
                <AlertDescription>{reasonMessage}</AlertDescription>
              </Alert>
            )}

            {loginError && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">{loginError}</div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/reset-password" className="text-sm text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
            <div className="text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
