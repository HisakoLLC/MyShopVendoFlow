/**
 * VendoFlow Design System Tokens
 * Modern, Premium, Fashion-forward — for fashion boutiques
 */

// ——— Primary: Deep Purple/Violet (fashion industry standard) ———
export const primary = {
  50: "#faf5ff",
  100: "#f3e8ff",
  200: "#e9d5ff",
  300: "#d8b4fe",
  400: "#c084fc",
  500: "#a855f7", // Main brand color
  600: "#9333ea",
  700: "#7e22ce",
  800: "#6b21a8",
  900: "#581c87",
  950: "#3b0764",
} as const;

// ——— Secondary: Rose/Pink (accent for fashion, use sparingly) ———
export const secondary = {
  50: "#fff1f2",
  100: "#ffe4e6",
  200: "#fecdd3",
  300: "#fda4af",
  400: "#fb7185",
  500: "#f43f5e",
  600: "#e11d48",
  700: "#be123c",
  800: "#9f1239",
  900: "#881337",
  950: "#4c0519",
} as const;

// ——— Semantic ———
export const success = {
  500: "#10b981",
} as const;

export const warning = {
  500: "#f59e0b",
} as const;

export const danger = {
  500: "#ef4444",
} as const;

// ——— Neutrals: Slate (cooler grays) ———
export const slate = {
  50: "#f8fafc",
  100: "#f1f5f9",
  200: "#e2e8f0",
  300: "#cbd5e1",
  400: "#94a3b8",
  500: "#64748b",
  600: "#475569",
  700: "#334155",
  800: "#1e293b",
  900: "#0f172a",
  950: "#020617",
} as const;

// ——— Typography ———
export const fontFamily = {
  sans: "var(--font-plus-jakarta-sans), ui-sans-serif, system-ui, sans-serif",
  body: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
} as const;

export const fontWeight = {
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
} as const;

// ——— Spacing (base unit: 4px) ———
export const spacing = {
  0: "0",
  0.5: "2px",
  1: "4px",
  2: "8px",
  3: "12px",
  4: "16px",
  5: "20px",
  6: "24px",
  8: "32px",
  10: "40px",
  12: "48px",
  16: "64px",
  20: "80px",
  24: "96px",
  32: "128px",
  40: "160px",
  48: "192px",
  64: "256px",
} as const;

// ——— Border radius ———
export const borderRadius = {
  sm: "6px",
  DEFAULT: "8px",
  md: "8px",
  lg: "12px",
  xl: "16px",
} as const;

// ——— Shadows ———
export const boxShadow = {
  sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  DEFAULT:
    "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
} as const;

// ——— Brand meta (for non-Tailwind use) ———
export const brand = {
  name: "VendoFlow",
  tagline: "Fashion Boutique POS",
  primary: primary[500],
  secondary: secondary[500],
} as const;
