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
          <p className="text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500 mb-2">
            View and manage inventory transfers between stores
          </p>
          <h1 className="font-editorial text-3xl font-bold leading-tight text-zinc-50">
            Inventory Transfers
          </h1>
        </div>
        <Link href="/inventory/transfer">
          <Button className="rounded-sm bg-white text-zinc-950 hover:bg-zinc-100 gap-2">
            <Plus className="h-4 w-4" />
            New Transfer
          </Button>
        </Link>
      </div>

      {transfers.length === 0 ? (
        <div className="rounded-lg border border-zinc-700/50 bg-zinc-900 p-12 text-center">
          <Package className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
          <h3 className="mb-4 font-editorial text-xl font-bold text-zinc-50">
            No transfers yet
          </h3>
          <p className="mb-4 text-sm text-zinc-500">
            Create your first transfer to move inventory between stores.
          </p>
          <Link href="/inventory/transfer">
            <Button className="rounded-sm bg-white text-zinc-950 hover:bg-zinc-100 gap-2">
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
              <h2 className="mb-4 font-editorial text-xl font-bold text-zinc-50">
                Pending Transfers
              </h2>
              <div className="rounded-lg border border-zinc-700/50 bg-zinc-900 overflow-hidden">
                <Table>
                  <TableHeader className="bg-zinc-900">
                    <TableRow className="border-b-2 border-zinc-700 hover:bg-transparent">
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">Product</TableHead>
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">Variant</TableHead>
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">From</TableHead>
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">To</TableHead>
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 text-right">Qty</TableHead>
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">Created</TableHead>
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingTransfers.map((transfer) => (
                      <TableRow key={transfer.transfer_id} className="border-b border-zinc-700/40 hover:bg-zinc-800/40 transition-colors duration-100 last:border-0">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={transfer.product_variants?.product_styles?.image_url ? "relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-zinc-800" : "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900"}>
                              {transfer.product_variants?.product_styles?.image_url ? (
                                <Image
                                  src={transfer.product_variants.product_styles.image_url}
                                  alt={transfer.product_variants.product_styles.name || ""}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <Package className="h-4 w-4 text-zinc-700" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-zinc-100">
                                {transfer.product_variants?.product_styles?.name || "—"}
                              </div>
                              {transfer.product_variants?.sku && (
                                <div className="font-mono text-[0.65rem] text-zinc-500 tracking-wider mt-1 uppercase">
                                  {transfer.product_variants.sku}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {transfer.product_variants ? (
                            <div className="text-sm text-zinc-400">
                              {transfer.product_variants.size} / {transfer.product_variants.color}
                            </div>
                          ) : (
                            <span className="text-sm text-zinc-500">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="text-sm text-zinc-300">
                            {transfer.stores_from?.name || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <ArrowRight className="h-3 w-3 text-zinc-600" />
                            <div className="text-sm text-zinc-300">
                              {transfer.stores_to?.name || "—"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <div className="text-sm font-mono text-zinc-100 tabular-nums">
                            {transfer.quantity}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {transfer.created_date ? (
                            <div className="text-xs font-mono text-zinc-500">
                              {new Date(transfer.created_date).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-sm text-zinc-500">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <Button
                            size="sm"
                            onClick={() => handleMarkReceived(transfer.transfer_id)}
                            disabled={completingId === transfer.transfer_id}
                            className="rounded-sm bg-zinc-100 text-zinc-950 hover:bg-white h-8 px-3 text-xs gap-2"
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
              <h2 className="mb-4 font-editorial text-xl font-bold text-zinc-50">
                Completed Transfers
              </h2>
              <div className="rounded-lg border border-zinc-700/50 bg-zinc-900 overflow-hidden">
                <Table>
                  <TableHeader className="bg-zinc-900">
                    <TableRow className="border-b-2 border-zinc-700 hover:bg-transparent">
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">Product</TableHead>
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">Variant</TableHead>
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">From</TableHead>
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">To</TableHead>
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500 text-right">Qty</TableHead>
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">Completed</TableHead>
                      <TableHead className="px-6 py-3 text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedTransfers.map((transfer) => (
                      <TableRow key={transfer.transfer_id} className="border-b border-zinc-700/40 hover:bg-zinc-800/40 transition-colors duration-100 last:border-0">
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={transfer.product_variants?.product_styles?.image_url ? "relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-zinc-800" : "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900"}>
                              {transfer.product_variants?.product_styles?.image_url ? (
                                <Image
                                  src={transfer.product_variants.product_styles.image_url}
                                  alt={transfer.product_variants.product_styles.name || ""}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <Package className="h-4 w-4 text-zinc-700" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-zinc-100">
                                {transfer.product_variants?.product_styles?.name || "—"}
                              </div>
                              {transfer.product_variants?.sku && (
                                <div className="font-mono text-[0.65rem] text-zinc-500 tracking-wider mt-1 uppercase">
                                  {transfer.product_variants.sku}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {transfer.product_variants ? (
                            <div className="text-sm text-zinc-400">
                              {transfer.product_variants.size} / {transfer.product_variants.color}
                            </div>
                          ) : (
                            <span className="text-sm text-zinc-500">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="text-sm text-zinc-300">
                            {transfer.stores_from?.name || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <ArrowRight className="h-3 w-3 text-zinc-600" />
                            <div className="text-sm text-zinc-300">
                              {transfer.stores_to?.name || "—"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <div className="text-sm font-mono text-zinc-100 tabular-nums">
                            {transfer.quantity}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {transfer.completed_date ? (
                            <div className="text-xs font-mono text-zinc-500">
                              {new Date(transfer.completed_date).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-sm text-zinc-500">—</span>
                          )}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge 
                            variant="outline" 
                            className="gap-1 bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 rounded-sm text-[0.65rem] font-semibold tracking-[0.1em] uppercase px-2 py-0.5"
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
