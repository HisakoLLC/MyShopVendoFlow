import type React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const statusBadgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", {
  variants: {
    variant: {
      paid: "bg-green-100 text-green-800",
      unpaid: "bg-red-100 text-red-800",
      partial: "bg-yellow-100 text-yellow-800",
      default: "bg-gray-100 text-gray-800",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof statusBadgeVariants> {
  status: string
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  let variant: "paid" | "unpaid" | "partial" | "default" = "default"

  // Map status to variant
  if (status === "Paid") variant = "paid"
  else if (status === "Unpaid") variant = "unpaid"
  else if (status === "Partial") variant = "partial"

  return (
    <div className={cn(statusBadgeVariants({ variant }), className)} {...props}>
      {status}
    </div>
  )
}
