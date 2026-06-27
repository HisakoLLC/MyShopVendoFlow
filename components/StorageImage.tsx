"use client"

import * as React from "react"
import Image from "next/image"
import { isSupabaseStorageUrl } from "@/lib/signed-storage-url"

interface StorageImageProps {
  /** Public or signed Supabase storage URL (or any image URL) */
  src: string | null | undefined
  alt: string
  width?: number
  height?: number
  fill?: boolean
  className?: string
  sizes?: string
  /** If true, always try to resolve via API (for Supabase storage URLs). Default true. */
  useSignedUrl?: boolean
}

/**
 * Renders an image from Supabase storage. For private buckets, fetches a signed URL
 * from the API so the image loads in the browser.
 */
export function StorageImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className,
  sizes,
  useSignedUrl = true,
}: StorageImageProps) {
  const [resolvedUrl, setResolvedUrl] = React.useState<string | null>(null)
  const [loadFailed, setLoadFailed] = React.useState(false)

  React.useEffect(() => {
    if (!src) {
      setResolvedUrl(null)
      setLoadFailed(false)
      return
    }
    if (!useSignedUrl || !isSupabaseStorageUrl(src)) {
      setResolvedUrl(src)
      setLoadFailed(false)
      return
    }
    let cancelled = false
    setLoadFailed(false)
    setResolvedUrl(null)
    const params = new URLSearchParams({ url: src })
    fetch(`/api/signed-url?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data.url) setResolvedUrl(data.url)
      })
      .catch(() => {
        if (!cancelled) setResolvedUrl(src)
      })
    return () => {
      cancelled = true
    }
  }, [src, useSignedUrl])

  const effectiveUrl = resolvedUrl ?? (!isSupabaseStorageUrl(src) ? src : null)

  if (!effectiveUrl || loadFailed) {
    return (
      <div
        className={className}
        style={
          width && height
            ? { width, height }
            : fill
              ? { width: "100%", height: "100%", minHeight: 80 }
              : undefined
        }
      >
        <div className="flex h-full w-full items-center justify-center bg-muted text-muted-foreground">
          <svg
            className="h-8 w-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      </div>
    )
  }

  if (fill) {
    return (
      <Image
        src={effectiveUrl}
        alt={alt}
        fill
        className={className}
        sizes={sizes}
        onError={() => setLoadFailed(true)}
        unoptimized={effectiveUrl.includes("supabase")}
      />
    )
  }

  return (
    <Image
      src={effectiveUrl}
      alt={alt}
      width={width ?? 60}
      height={height ?? 60}
      className={className}
      onError={() => setLoadFailed(true)}
      unoptimized={effectiveUrl.includes("supabase")}
    />
  )
}
