"use client"

import * as React from "react"
import Link from "next/link"
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { ArrowUpDown, TrendingDown, TrendingUp } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export type StoreComparisonRow = {
  store_id: string
  store_name: string
  revenue: number
  transactions: number
  avg_basket: number
  revenue_per_day: number
  trend_percent: number
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value || 0)

export function StoreComparisonTable({
  rows,
  periodLabel = "Last 30 days",
}: {
  rows: StoreComparisonRow[]
  periodLabel?: string
}) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "revenue", desc: true },
  ])

  const columns = React.useMemo<ColumnDef<StoreComparisonRow>[]>(
    () => [
      {
        accessorKey: "store_name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="h-8 px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Store Name <ArrowUpDown className="ml-2 h-4 w-4 opacity-60" />
          </Button>
        ),
        cell: ({ row }) => {
          const s = row.original
          return (
            <Link
              href={`/dashboard?store=${encodeURIComponent(s.store_id)}`}
              className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
            >
              {s.store_name || "Unnamed store"}
            </Link>
          )
        },
      },
      {
        accessorKey: "revenue",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="h-8 px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Revenue ({periodLabel}) <ArrowUpDown className="ml-2 h-4 w-4 opacity-60" />
          </Button>
        ),
        cell: ({ getValue }) => (
          <span className="tabular-nums">{formatCurrency(Number(getValue() || 0))}</span>
        ),
      },
      {
        accessorKey: "transactions",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="h-8 px-2 hidden sm:inline-flex"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Transactions <ArrowUpDown className="ml-2 h-4 w-4 opacity-60" />
          </Button>
        ),
        cell: ({ getValue }) => (
          <span className="tabular-nums hidden sm:inline">{Number(getValue() || 0)}</span>
        ),
      },
      {
        accessorKey: "avg_basket",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="h-8 px-2 hidden md:inline-flex"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Avg Basket <ArrowUpDown className="ml-2 h-4 w-4 opacity-60" />
          </Button>
        ),
        cell: ({ getValue }) => (
          <span className="tabular-nums hidden md:inline">
            {formatCurrency(Number(getValue() || 0))}
          </span>
        ),
      },
      {
        accessorKey: "revenue_per_day",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="h-8 px-2 hidden lg:inline-flex"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Revenue / Day <ArrowUpDown className="ml-2 h-4 w-4 opacity-60" />
          </Button>
        ),
        cell: ({ getValue }) => (
          <span className="tabular-nums hidden lg:inline">
            {formatCurrency(Number(getValue() || 0))}
          </span>
        ),
      },
      {
        accessorKey: "trend_percent",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="h-8 px-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Trend <ArrowUpDown className="ml-2 h-4 w-4 opacity-60" />
          </Button>
        ),
        cell: ({ row }) => {
          const v = row.original.trend_percent || 0
          const up = v >= 0
          return (
            <span
              className={cn(
                "inline-flex items-center gap-1 tabular-nums",
                up ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"
              )}
            >
              {up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              {Math.abs(v).toFixed(1)}%
            </span>
          )
        },
      },
    ],
    [periodLabel]
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (!rows || rows.length === 0) {
    return (
      <div className="flex h-[220px] items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
        No sales data yet.
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                className={cn(
                  header.column.id === "transactions" && "hidden sm:table-cell",
                  header.column.id === "avg_basket" && "hidden md:table-cell",
                  header.column.id === "revenue_per_day" && "hidden lg:table-cell"
                )}
              >
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <TableCell
                key={cell.id}
                className={cn(
                  cell.column.id === "transactions" && "hidden sm:table-cell",
                  cell.column.id === "avg_basket" && "hidden md:table-cell",
                  cell.column.id === "revenue_per_day" && "hidden lg:table-cell"
                )}
              >
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

