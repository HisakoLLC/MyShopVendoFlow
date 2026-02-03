"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex min-h-[120px] w-full rounded-lg border border-border-light bg-background-card-light px-3 py-2 text-sm text-text-primary-light ring-offset-2",
        "placeholder:text-text-secondary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
        "dark:border-border-dark dark:bg-background-card-dark dark:text-white dark:placeholder:text-text-secondary-dark dark:focus-visible:ring-primary",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = "Textarea"

export { Textarea }

