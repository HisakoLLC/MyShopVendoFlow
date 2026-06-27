import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { 
  Package, 
  Plus, 
  ArrowLeft, 
  Pencil, 
  Trash2, 
  Mail, 
  Phone, 
  CreditCard 
} from "lucide-react"

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { SupplierQuickAddModal } from "@/components/purchasing/SupplierQuickAddModal"
import { SuppliersClient } from "./suppliers-client"

export const dynamic = "force-dynamic"

export type Supplier = {
  supplier_id: string
  name: string
  email: string | null
  phone: string | null
  payment_terms: string | null
  notes: string | null
  created_at: string
}

async function fetchSuppliers(): Promise<Supplier[]> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) redirect("/login")

  const { data: accountIdRaw, error: accountIdError } = await supabase.rpc("get_account_id")
  const accountId = Array.isArray(accountIdRaw)
    ? accountIdRaw[0]
    : typeof accountIdRaw === "object" && accountIdRaw !== null && "account_id" in accountIdRaw
      ? (accountIdRaw as { account_id: string }).account_id
      : accountIdRaw
  if (accountIdError || !accountId) redirect("/onboarding")

  const { data, error } = await supabase
    .from("suppliers")
    .select("supplier_id, name, email, phone, payment_terms, notes, created_at")
    .eq("account_id", accountId)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return (data || []) as Supplier[]
}

async function SuppliersContent() {
  const suppliers = await fetchSuppliers()

  return (
    <div className="min-h-screen bg-background text-foreground px-8 py-8">
      {/* BACK LINK */}
      <Link 
        href="/purchasing" 
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
        Purchasing
      </Link>

      <SuppliersClient initialSuppliers={suppliers} />
    </div>
  )
}

export default function SuppliersPage() {
  return (
    <Suspense fallback={
      <div className="px-8 py-8">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="mt-8 h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    }>
      <SuppliersContent />
    </Suspense>
  )
}
