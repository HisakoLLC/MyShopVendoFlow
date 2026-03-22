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
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/purchasing" 
          className="group mb-4 flex items-center gap-2 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-zinc-200"
        >
          <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />
          Purchasing
        </Link>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2">
              MANAGE YOUR SUPPLIER CONTACTS AND PAYMENT TERMS
            </p>
            <h1 className="font-editorial text-3xl font-bold leading-tight text-zinc-50">
              Suppliers
            </h1>
          </div>
          <SuppliersClient initialSuppliers={suppliers} />
        </div>
      </div>
    </div>
  )
}

export default function SuppliersPage() {
  return (
    <Suspense fallback={
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="h-8 w-48 animate-pulse rounded bg-zinc-800" />
        <div className="mt-8 h-64 animate-pulse rounded-xl bg-zinc-800" />
      </div>
    }>
      <SuppliersContent />
    </Suspense>
  )
}
