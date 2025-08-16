"use client"

import type React from "react"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import type { DateRange } from "react-day-picker"

export type SalesFilters = {
  search: string
  dateRange: DateRange | undefined
  paymentStatus: string
  paymentMethod: string
  salesperson: string
}

type SalesFiltersProps = {
  filters: SalesFilters
  onFiltersChange: (filters: SalesFilters) => void
  salespeople: { id: string; name: string }[]
}

export function SalesFilters({ filters, onFiltersChange, salespeople }: SalesFiltersProps) {
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, search: e.target.value })
  }

  const handleDateRangeChange = (range: DateRange | undefined) => {
    onFiltersChange({ ...filters, dateRange: range })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer, invoice or item..."
            value={filters.search}
            onChange={handleSearchChange}
            className="pl-8"
          />
        </div>
        <DateRangePicker
          dateRange={filters.dateRange}
          onDateRangeChange={handleDateRangeChange}
          className="w-full sm:w-auto sm:min-w-[240px]"
        />
      </div>
    </div>
  )
}
