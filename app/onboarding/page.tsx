"use client"

import * as React from "react"
import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast, Toaster } from "sonner"
import { Check, Plus, X, Sparkles } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { ensureAccountForCurrentUser } from "./actions"

export const dynamic = "force-dynamic"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { v4 as uuidv4 } from "uuid"

type Plan = {
  id: string
  name: string
  price: number
  stores: number
  features: string[]
  recommended?: boolean
}

const plans: Plan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 10000,
    stores: 1,
    features: ["Basic inventory", "Sales tracking", "Customer management"],
  },
  {
    id: "core",
    name: "Core",
    price: 16500,
    stores: 1,
    features: ["Full inventory", "Advanced reports", "Multi-rate tax", "Staff management"],
    recommended: true,
  },
  {
    id: "scale",
    name: "Scale",
    price: 29000,
    stores: 1,
    features: ["Everything in Core", "Unlimited staff", "Priority support", "API access"],
  },
]

const defaultCategories = [
  "Dresses",
  "Tops",
  "Bottoms",
  "Accessories",
  "Shoes",
  "Outerwear",
]

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get("redirect") || "/dashboard"
  const supabase = React.useMemo(() => createClient(), [])
  const [step, setStep] = React.useState(0)
  const [isLoading, setIsLoading] = React.useState(false)

  // Step 1: Store
  const [storeName, setStoreName] = React.useState("")
  const [storeAddress, setStoreAddress] = React.useState("")
  const [taxRate, setTaxRate] = React.useState("16.00")

  // Step 2: Categories
  const [selectedCategories, setSelectedCategories] = React.useState<string[]>(defaultCategories)
  const [customCategory, setCustomCategory] = React.useState("")
  const [customCategories, setCustomCategories] = React.useState<string[]>([])

  // Step 3: Plan
  const [selectedPlan, setSelectedPlan] = React.useState<string | null>(null)

  const toAccountId = (v: unknown): string | null => {
    if (v == null) return null
    if (typeof v === "string") return v || null
    if (Array.isArray(v)) return v[0] != null ? String(v[0]) : null
    if (typeof v === "object" && v !== null && "account_id" in v) return String((v as { account_id: unknown }).account_id) || null
    return String(v) || null
  }

  const handleStep1 = async () => {
    if (!storeName.trim()) {
      toast.error("Store name is required")
      return
    }

    setIsLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast.error("You must be signed in")
        return
      }

      let accountId: string | null = toAccountId((await supabase.rpc("get_account_id")).data)
      if (!accountId) {
        const ensured = await ensureAccountForCurrentUser()
        if (ensured.success) accountId = ensured.accountId
        else {
          toast.error(ensured.error || "Account not found")
          return
        }
      }
      if (!accountId) {
        toast.error("Account not found")
        return
      }

      const taxRateNum = taxRate
        ? Math.min(100, Math.max(0, parseFloat(taxRate) || 0))
        : 16
      const taxRateRounded = Math.round(taxRateNum * 100) / 100

      const { error } = await supabase.from("stores").insert({
        account_id: accountId,
        name: storeName.trim(),
        address: storeAddress.trim() || null,
        tax_rate: taxRateRounded,
        active: true,
      })

      if (error) {
        throw new Error(error.message)
      }

      setStep(2)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create store")
    } finally {
      setIsLoading(false)
    }
  }

  const handleStep2 = async () => {
    if (selectedCategories.length === 0 && customCategories.length === 0) {
      toast.error("Please select at least one category")
      return
    }

    setIsLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast.error("You must be signed in")
        return
      }

      let accountId: string | null = toAccountId((await supabase.rpc("get_account_id")).data)
      if (!accountId) {
        const ensured = await ensureAccountForCurrentUser()
        if (ensured.success) accountId = ensured.accountId
        else {
          toast.error(ensured.error || "Account not found")
          return
        }
      }
      if (!accountId) {
        toast.error("Account not found")
        return
      }

      // Insert all categories
      const allCategories = [...selectedCategories, ...customCategories]
      const categoriesToInsert = allCategories.map((name) => ({
        category_id: uuidv4(),
        account_id: accountId,
        name: name.trim(),
      }))

      const { error } = await supabase.from("categories").insert(categoriesToInsert)

      if (error) {
        throw new Error(error.message)
      }

      setStep(3)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create categories")
    } finally {
      setIsLoading(false)
    }
  }

  const handleStep3 = async () => {
    if (!selectedPlan) {
      toast.error("Please select a plan")
      return
    }

    setIsLoading(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        toast.error("You must be signed in")
        return
      }

      let accountId: string | null = toAccountId((await supabase.rpc("get_account_id")).data)
      if (!accountId) {
        const ensured = await ensureAccountForCurrentUser()
        if (ensured.success) accountId = ensured.accountId
        else {
          toast.error(ensured.error || "Account not found")
          return
        }
      }
      if (!accountId) {
        toast.error("Account not found")
        return
      }

      const { error } = await supabase
        .from("accounts")
        .update({
          plan_tier: selectedPlan,
          subscription_status: "active",
        })
        .eq("account_id", accountId)

      if (error) {
        throw new Error(error.message)
      }

      toast.success("Plan set! One more step — choose how you'd like to get started.")
      setStep(4)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to set plan")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoToDashboard = () => {
    router.push(redirectTo)
    router.refresh()
  }

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== category))
    } else {
      setSelectedCategories([...selectedCategories, category])
    }
  }

  const addCustomCategory = () => {
    if (customCategory.trim() && !customCategories.includes(customCategory.trim())) {
      setCustomCategories([...customCategories, customCategory.trim()])
      setCustomCategory("")
    }
  }

  const removeCustomCategory = (category: string) => {
    setCustomCategories(customCategories.filter((c) => c !== category))
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background-light px-4 py-12 dark:bg-background-dark">
      <Toaster richColors position="top-right" />
      <div className="w-full max-w-2xl space-y-8">
        {/* Progress Indicator */}
        {step < 4 && (
          <div className="flex items-center justify-center gap-2">
            {[0, 1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                    step >= s
                      ? "border-primary bg-primary text-primary-foreground dark:border-primary dark:bg-primary dark:text-primary-foreground"
                      : "border-zinc-300 text-zinc-400 dark:border-zinc-700 dark:text-zinc-600"
                  }`}
                >
                  {s + 1}
                </div>
                {s < 3 && (
                  <div
                    className={`h-1 w-16 ${
                      step > s ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-300 dark:bg-zinc-700"
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Step 0: Welcome */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-8 w-8 text-amber-500" />
                <CardTitle className="text-2xl">Welcome to VendoFlow</CardTitle>
              </div>
              <CardDescription className="text-base">
                Your all-in-one POS and inventory for small retail. We’ll guide you through creating your store, adding categories, and choosing a plan. You can load sample data anytime to explore the app.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setStep(1)} className="w-full" size="lg">
                Get started
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Create Store */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Create Your Store</CardTitle>
              <CardDescription>Set up your store location</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="storeName">Store Name *</Label>
                <Input
                  id="storeName"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="Main Store"
                  required
                  disabled={isLoading}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="storeAddress">Address</Label>
                <Input
                  id="storeAddress"
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  placeholder="123 Main Street, Nairobi"
                  disabled={isLoading}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input
                  id="taxRate"
                  type="number"
                  step="0.01"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  placeholder="16.00"
                  disabled={isLoading}
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Default: 16% VAT (Kenya standard)
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(0)} disabled={isLoading}>
                  Back
                </Button>
                <Button onClick={handleStep1} className="flex-1" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Next"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Categories */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Add Product Categories</CardTitle>
              <CardDescription>Select categories that apply to your boutique</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {defaultCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => toggleCategory(category)}
                    disabled={isLoading}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      selectedCategories.includes(category)
                        ? "border-primary bg-primary text-primary-foreground dark:border-primary dark:bg-primary dark:text-primary-foreground"
                        : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                    }`}
                  >
                    {selectedCategories.includes(category) && (
                      <Check className="mb-1 h-4 w-4" />
                    )}
                    {category}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Label>Add Custom Category</Label>
                <div className="flex gap-2">
                  <Input
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="e.g., Jewelry"
                    disabled={isLoading}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        addCustomCategory()
                      }
                    }}
                  />
                  <Button type="button" onClick={addCustomCategory} disabled={isLoading}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {customCategories.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {customCategories.map((cat) => (
                      <Badge key={cat} variant="secondary" className="gap-1">
                        {cat}
                        <button
                          type="button"
                          onClick={() => removeCustomCategory(cat)}
                          className="ml-1 hover:text-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} disabled={isLoading}>
                  Back
                </Button>
                <Button onClick={handleStep2} className="flex-1" disabled={isLoading}>
                  {isLoading ? "Creating..." : "Next"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Success — Go to dashboard */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">You're all set! 🎉</CardTitle>
              <CardDescription className="text-base">
                Welcome to VendoFlow. Go to your dashboard to start adding products and making sales.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleGoToDashboard}
                className="w-full"
                size="lg"
              >
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Plan */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Choose Your Plan</CardTitle>
              <CardDescription>Choose a plan that fits your business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                {plans.map((plan) => (
                  <Card
                    key={plan.id}
                    className={`cursor-pointer transition-all ${
                      selectedPlan === plan.id
                        ? "border-zinc-900 ring-2 ring-zinc-900 dark:border-zinc-100 dark:ring-zinc-100"
                        : "hover:border-zinc-400 dark:hover:border-zinc-600"
                    } ${plan.recommended ? "border-blue-500" : ""}`}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        {plan.recommended && (
                          <Badge variant="default">Recommended</Badge>
                        )}
                      </div>
                      <div className="mt-2">
                        <span className="text-2xl font-bold">KES {plan.price.toLocaleString()}</span>
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">/month</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-600" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(2)} disabled={isLoading}>
                  Back
                </Button>
                <Button
                  onClick={handleStep3}
                  className="flex-1"
                  disabled={isLoading || !selectedPlan}
                >
                  {isLoading ? "Setting up..." : "Continue"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-background-light px-4 py-12 dark:bg-background-dark">
        <div className="text-center">
          <div className="text-lg font-semibold">Loading...</div>
        </div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  )
}
