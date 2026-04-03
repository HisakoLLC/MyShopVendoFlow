import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
}

export function LoadingSkeleton({ className }: SkeletonProps) {
  return (
    <div 
      className={cn(
        "animate-pulse bg-[#1a1a1a] rounded-sm",
        className
      )} 
    />
  )
}

export function SkeletonCircle({ className }: SkeletonProps) {
  return (
    <LoadingSkeleton className={cn("rounded-full", className)} />
  )
}

export function SkeletonText({ className }: SkeletonProps) {
  return (
    <LoadingSkeleton className={cn("h-4 w-full", className)} />
  )
}
