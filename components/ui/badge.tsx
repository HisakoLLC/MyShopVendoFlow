import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2 dark:focus:ring-zinc-300",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-white hover:bg-primary-hover dark:bg-primary dark:text-white dark:hover:bg-primary-hover",
        secondary:
          "border-transparent bg-background-hover-light text-text-primary-light hover:bg-border-divider-light dark:bg-background-hover-dark dark:text-text-primary-dark dark:hover:bg-border-divider-dark",
        destructive:
          "border-transparent bg-semantic-error text-white hover:bg-red-700 dark:bg-semantic-error dark:text-white",
        outline: "text-text-primary-light dark:text-text-primary-dark",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
