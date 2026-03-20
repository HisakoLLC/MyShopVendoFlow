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
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Transfer
          </Button>
        </Link>
      </div>

      {transfers.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-background-card-light p-12 text-center dark:border-border-dark dark:bg-background-card-dark">
          <Package className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
          <h3 className="mb-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            No transfers yet
          </h3>
          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
            Create your first transfer to move inventory between stores.
          </p>
          <Link href="/inventory/transfer">
            <Button className="gap-2">
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
              <h2 className="mb-4 text-lg font-semibold text-zinc-100">
                Pending Transfers
              </h2>
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingTransfers.map((transfer) => (
                      <TableRow key={transfer.transfer_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={transfer.product_variants?.product_styles?.image_url ? "relative h-10 w-10 shrink-0 overflow-hidden rounded-md" : "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800"}>
                              {transfer.product_variants?.product_styles?.image_url ? (
                                <Image
                                  src={transfer.product_variants.product_styles.image_url}
                                  alt={transfer.product_variants.product_styles.name || ""}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <Package className="h-4 w-4 text-zinc-600" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-zinc-100">
                                {transfer.product_variants?.product_styles?.name || "—"}
                              </div>
                              {transfer.product_variants?.sku && (
                                <div className="font-mono text-xs text-zinc-400 tracking-wide mt-0.5">
                                  {transfer.product_variants.sku}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {transfer.product_variants ? (
                            <div className="text-sm text-zinc-300">
                              {transfer.product_variants.size} / {transfer.product_variants.color}
                            </div>
                          ) : (
                            <span className="text-sm text-zinc-500">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-zinc-300">
                            {transfer.stores_from?.name || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <ArrowRight className="inline h-4 w-4 text-zinc-500" />
                          <div className="ml-2 inline font-medium text-zinc-300">
                            {transfer.stores_to?.name || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-sm font-semibold text-zinc-100 tabular-nums">
                            {transfer.quantity}
                          </div>
                        </TableCell>
                        <TableCell>
                          {transfer.created_date ? (
                            <div className="text-sm text-zinc-400">
                              {new Date(transfer.created_date).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-sm text-zinc-500">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleMarkReceived(transfer.transfer_id)}
                            disabled={completingId === transfer.transfer_id}
                            className="gap-2"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {completingId === transfer.transfer_id ? "Processing..." : "Mark Received"}
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
              <h2 className="mb-4 text-lg font-semibold text-zinc-100">
                Completed Transfers
              </h2>
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead>Completed</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedTransfers.map((transfer) => (
                      <TableRow key={transfer.transfer_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={transfer.product_variants?.product_styles?.image_url ? "relative h-10 w-10 shrink-0 overflow-hidden rounded-md" : "flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-700 bg-zinc-800"}>
                              {transfer.product_variants?.product_styles?.image_url ? (
                                <Image
                                  src={transfer.product_variants.product_styles.image_url}
                                  alt={transfer.product_variants.product_styles.name || ""}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <Package className="h-4 w-4 text-zinc-600" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-zinc-100">
                                {transfer.product_variants?.product_styles?.name || "—"}
                              </div>
                              {transfer.product_variants?.sku && (
                                <div className="font-mono text-xs text-zinc-400 tracking-wide mt-0.5">
                                  {transfer.product_variants.sku}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {transfer.product_variants ? (
                            <div className="text-sm text-zinc-300">
                              {transfer.product_variants.size} / {transfer.product_variants.color}
                            </div>
                          ) : (
                            <span className="text-sm text-zinc-500">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-zinc-300">
                            {transfer.stores_from?.name || "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <ArrowRight className="inline h-4 w-4 text-zinc-500" />
                          <div className="ml-2 inline font-medium text-zinc-300">
                            {transfer.stores_to?.name || "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-sm font-semibold text-zinc-100 tabular-nums">
                            {transfer.quantity}
                          </div>
                        </TableCell>
                        <TableCell>
                          {transfer.completed_date ? (
                            <div className="text-sm text-zinc-400">
                              {new Date(transfer.completed_date).toLocaleDateString()}
                            </div>
                          ) : (
                            <span className="text-sm text-zinc-500">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="gap-1">
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
