"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { Plus, Package, ArrowRight, CheckCircle2, Clock } from "lucide-react"
import { toast, Toaster } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { completeInventoryTransfer } from "@/app/inventory/actions"

type Transfer = {
  transfer_id: string
  from_store_id: string | null
  to_store_id: string | null
  variant_id: string | null
  quantity: number
  status: string | null
  created_date: string | null
  completed_date: string | null
  stores_from: {
    name: string
  } | null
  stores_to: {
    name: string
  } | null
  product_variants: {
    size: string
    color: string
    sku: string
    product_styles: {
      name: string
      image_url: string | null
    } | null
  } | null
}

type TransfersListProps = {
  transfers: Transfer[]
}

export function TransfersList({ transfers: initialTransfers }: TransfersListProps) {
  const [transfers, setTransfers] = React.useState<Transfer[]>(initialTransfers)
  const [completingId, setCompletingId] = React.useState<string | null>(null)

  const handleMarkReceived = async (transferId: string) => {
    setCompletingId(transferId)
    try {
      await completeInventoryTransfer(transferId)
      toast.success("Transfer completed successfully!")
      // Update local state
      setTransfers((prev) =>
        prev.map((t) =>
          t.transfer_id === transferId
            ? {
                ...t,
                status: "completed",
                completed_date: new Date().toISOString(),
              }
            : t
        )
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to complete transfer.")
    } finally {
      setCompletingId(null)
    }
  }

  const pendingTransfers = transfers.filter((t) => t.status === "pending")
  const completedTransfers = transfers.filter((t) => t.status === "completed")

  return (
    <>
      <Toaster richColors position="top-right" />
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-muted-foreground mb-2">
            View and manage inventory transfers between stores
          </p>
          <h1 className="font-sans text-3xl font-bold leading-tight text-foreground">
            Inventory Transfers
          </h1>
        </div>
        <Link href="/inventory/transfer">
          <Button className="rounded-md bg-[#E8400C] text-white hover:bg-[#c73508] gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            New Transfer
          </Button>
        </Link>
      </div>

      {transfers.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center shadow-sm">
          <Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-4 font-sans text-xl font-bold text-foreground">
            No transfers yet
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Create your first transfer to move inventory between stores.
          </p>
          <Link href="/inventory/transfer">
            <Button className="rounded-md bg-[#E8400C] text-white hover:bg-[#c73508] gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              Create Transfer
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending Transfers */}
          {pendingTransfers.length > 0 && (
            <div>
              <h2 className="mb-4 font-sans text-xl font-bold text-foreground">
                Pending Transfers
              </h2>
              <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="border-b border-border hover:bg-transparent">
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Product</TableHead>
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Variant</TableHead>
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">From</TableHead>
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">To</TableHead>
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground text-right">Qty</TableHead>
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Created</TableHead>
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingTransfers.map((transfer) => (
                      <TableRow key={transfer.transfer_id} className="border-b border-border hover:bg-accent/50 transition-colors duration-100 last:border-0">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={transfer.product_variants?.product_styles?.image_url ? "relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border" : "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40"}>
                              {transfer.product_variants?.product_styles?.image_url ? (
                                <Image
                                  src={transfer.product_variants.product_styles.image_url}
                                  alt={transfer.product_variants.product_styles.name || ""}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <Package className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-foreground">
                                {transfer.product_variants?.product_styles?.name || "—"}
                              </div>
                              {transfer.product_variants?.sku && (
                                <div className="font-mono text-[0.65rem] text-muted-foreground tracking-wider mt-1 uppercase">
                                  {transfer.product_variants.sku}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {transfer.product_variants ? (
                            <div className="text-sm text-muted-foreground">
                              {transfer.product_variants.size} / {transfer.product_variants.color}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="text-sm text-foreground">
                            {transfer.stores_from?.name || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <div className="text-sm text-foreground">
                              {transfer.stores_to?.name || "—"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <div className="text-sm font-mono text-foreground tabular-nums font-semibold">
                            {transfer.quantity}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {transfer.created_date ? (
                            <div className="text-xs font-mono text-muted-foreground">
                              {new Date(transfer.created_date).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <Button
                            size="sm"
                            onClick={() => handleMarkReceived(transfer.transfer_id)}
                            disabled={completingId === transfer.transfer_id}
                            className="rounded-md bg-[#E8400C] text-white hover:bg-[#c73508] h-8 px-3 text-xs gap-2 shadow-sm"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {completingId === transfer.transfer_id ? "..." : "Received"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Completed Transfers */}
          {completedTransfers.length > 0 && (
            <div>
              <h2 className="mb-4 font-sans text-xl font-bold text-foreground">
                Completed Transfers
              </h2>
              <div className="rounded-lg border border-border bg-card shadow-sm overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow className="border-b border-border hover:bg-transparent">
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Product</TableHead>
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Variant</TableHead>
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">From</TableHead>
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">To</TableHead>
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground text-right">Qty</TableHead>
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Completed</TableHead>
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedTransfers.map((transfer) => (
                      <TableRow key={transfer.transfer_id} className="border-b border-border hover:bg-accent/50 transition-colors duration-100 last:border-0">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={transfer.product_variants?.product_styles?.image_url ? "relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-border" : "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-muted/40"}>
                              {transfer.product_variants?.product_styles?.image_url ? (
                                <Image
                                  src={transfer.product_variants.product_styles.image_url}
                                  alt={transfer.product_variants.product_styles.name || ""}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <Package className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-foreground">
                                {transfer.product_variants?.product_styles?.name || "—"}
                              </div>
                              {transfer.product_variants?.sku && (
                                <div className="font-mono text-[0.65rem] text-muted-foreground tracking-wider mt-1 uppercase">
                                  {transfer.product_variants.sku}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {transfer.product_variants ? (
                            <div className="text-sm text-muted-foreground">
                              {transfer.product_variants.size} / {transfer.product_variants.color}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="text-sm text-foreground">
                            {transfer.stores_from?.name || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <div className="text-sm text-foreground">
                              {transfer.stores_to?.name || "—"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <div className="text-sm font-mono text-foreground tabular-nums font-semibold">
                            {transfer.quantity}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {transfer.completed_date ? (
                            <div className="text-xs font-mono text-muted-foreground">
                              {new Date(transfer.completed_date).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge 
                            variant="outline" 
                            className="gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded-md text-[0.65rem] font-semibold tracking-[0.1em] uppercase px-2 py-0.5"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Completed
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
