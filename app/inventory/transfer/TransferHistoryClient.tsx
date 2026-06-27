"use client"

import * as React from "react"
import { toast } from "sonner"
import { CheckCircle2 } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { completeInventoryTransfer } from "@/app/inventory/actions"

type HistoryRow = {
  transfer_id: string
  created_at: string
  product_name: string
  variant_details: string
  from_store_name: string
  to_store_name: string
  quantity: number
  status: string
  created_by_name: string
}

function TransferHistorySkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 h-5 w-32 animate-pulse rounded bg-muted" />
      <div className="h-32 w-full animate-pulse rounded bg-muted" />
    </div>
  )
}

export function TransferHistoryClient() {
  const [rows, setRows] = React.useState<HistoryRow[] | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [completingId, setCompletingId] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/inventory/transfer-history", { cache: "no-store" })
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null
          if (!cancelled) setError(body?.error || "Unable to load transfer history.")
          return
        }
        const data = (await res.json()) as { transfers?: HistoryRow[] }
        if (!cancelled) {
          setRows(data.transfers || [])
        }
      } catch (e) {
        if (!cancelled) {
          setError("Unable to load transfer history.")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const handleMarkReceived = async (transferId: string) => {
    setCompletingId(transferId)
    try {
      await completeInventoryTransfer(transferId)
      toast.success("Transfer marked as received.")
      setRows((prev) =>
        (prev || []).map((t) =>
          t.transfer_id === transferId
            ? {
                ...t,
                status: "completed",
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

  if (loading) {
    return <TransferHistorySkeleton />
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        No transfers recorded yet.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader className="bg-muted/40">
        <TableRow className="border-b border-border hover:bg-transparent">
          <TableHead className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Date / Time</TableHead>
          <TableHead className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Product</TableHead>
          <TableHead className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">From → To</TableHead>
          <TableHead className="text-right text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Quantity</TableHead>
          <TableHead className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Initiated By</TableHead>
          <TableHead className="text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Status</TableHead>
          <TableHead className="text-right text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-muted-foreground">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((t) => (
          <TableRow key={t.transfer_id} className="border-b border-border hover:bg-accent/50 transition-colors">
            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
              {t.created_at ? new Date(t.created_at).toLocaleString() : "—"}
            </TableCell>
            <TableCell className="text-sm">
              <div className="font-medium text-foreground">
                {t.product_name}
              </div>
              <div className="text-xs text-muted-foreground">
                {t.variant_details}
              </div>
            </TableCell>
            <TableCell className="text-sm text-foreground">
              <div className="flex items-center gap-1">
                <span>{t.from_store_name}</span>
                <span className="text-xs text-muted-foreground">→</span>
                <span>{t.to_store_name}</span>
              </div>
            </TableCell>
            <TableCell className="text-right text-sm font-semibold tabular-nums font-mono text-foreground">
              {t.quantity}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {t.created_by_name}
            </TableCell>
            <TableCell className="text-sm capitalize text-foreground">
              {t.status}
            </TableCell>
            <TableCell className="text-right text-sm">
              {t.status === "pending" ? (
                <Button
                  size="sm"
                  onClick={() => handleMarkReceived(t.transfer_id)}
                  disabled={completingId === t.transfer_id}
                  className="gap-2 bg-[#E8400C] text-white hover:bg-[#c73508] rounded-md shadow-sm"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {completingId === t.transfer_id ? "Processing..." : "Mark Received"}
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

