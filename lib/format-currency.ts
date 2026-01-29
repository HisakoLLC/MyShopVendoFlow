/**
 * Format amount with currency symbol/code.
 * currency: e.g. "KES", "USD"
 */
export function formatCurrency(
  amount: number,
  currency: string = "KES",
  options?: { maximumFractionDigits?: number }
): string {
  const code = currency.toUpperCase()
  try {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: code,
      maximumFractionDigits: options?.maximumFractionDigits ?? 0,
      minimumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${code} ${amount.toLocaleString("en-KE", { maximumFractionDigits: options?.maximumFractionDigits ?? 0 })}`
  }
}

export const CURRENCY_OPTIONS = [
  { value: "KES", label: "Ksh (Kenyan Shilling)" },
  { value: "USD", label: "$ (US Dollar)" },
  { value: "EUR", label: "€ (Euro)" },
  { value: "GBP", label: "£ (British Pound)" },
] as const
