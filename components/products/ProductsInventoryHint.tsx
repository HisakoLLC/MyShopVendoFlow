"use client"

import * as React from "react"

const LOCAL_STORAGE_KEY = "vendo_inventory_tip_dismissed"

export function ProductsInventoryHint() {
  const [dismissed, setDismissed] = React.useState(true)

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    setDismissed(stored === "true")
  }, [])

  if (dismissed) return null

  return (
    <div className="mt-3 flex items-start gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-xs text-foreground">
      <div className="text-base leading-none">💡</div>
      <div className="flex-1">
        <div className="font-medium text-foreground">
          Tip: Products are shared across all stores, but inventory is tracked separately per store.
        </div>
        <div className="mt-0.5 text-muted-foreground">
          Set how many units you have at each location so your stock levels stay accurate in POS and
          reports.
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          if (typeof window !== "undefined") {
            window.localStorage.setItem(LOCAL_STORAGE_KEY, "true")
          }
          setDismissed(true)
        }}
        className="ml-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
      >
        Dismiss
      </button>
    </div>
  )
}

