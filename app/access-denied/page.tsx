"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ShieldAlert, LogIn, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

export default function AccessDeniedPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const permission = searchParams.get("permission")
  const { user, signOut } = useAuth()

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center">
            <ShieldAlert className="h-12 w-12 text-destructive mb-2" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Access Denied</CardTitle>
          <CardDescription className="text-center">
            {permission
              ? `You don't have the required permission: ${permission}`
              : "You don't have permission to access this page."}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <p>
            {user
              ? "Your account doesn't have sufficient privileges to access this area. Please contact your administrator if you believe this is an error."
              : "This area is restricted to authorized users only. Please log in with an authorized account."}
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          {user ? (
            <>
              <Button className="w-full" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
              <Button variant="ghost" className="w-full" onClick={() => signOut()}>
                Sign Out
              </Button>
            </>
          ) : (
            <>
              <Button className="w-full" onClick={() => router.push("/login")}>
                <LogIn className="mr-2 h-4 w-4" />
                Go to Login
              </Button>
              <Link href="/" className="text-sm text-primary hover:underline text-center w-full">
                Return to Home
              </Link>
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
