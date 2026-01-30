import type { Config } from "tailwindcss"
import {
  primary,
  secondary,
  success,
  warning,
  danger,
  slate,
  borderRadius as radiusTokens,
  boxShadow as shadowTokens,
} from "./lib/design-tokens"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // VendoFlow brand palette
        primary: {
          ...primary,
          DEFAULT: primary[500],
          foreground: "#ffffff",
        },
        secondary: {
          ...secondary,
          DEFAULT: secondary[500],
          foreground: "#ffffff",
        },
        success: success,
        warning: warning,
        danger: danger,
        slate: slate,
        // Semantic (theme-aware) — map to CSS variables for light/dark
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
      },
      fontFamily: {
        sans: [
          "var(--font-plus-jakarta-sans)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        body: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: radiusTokens.sm,
        DEFAULT: radiusTokens.DEFAULT,
        md: radiusTokens.md,
        lg: radiusTokens.lg,
        xl: radiusTokens.xl,
        // Legacy semantic (for shadcn components)
        "radius-sm": "calc(var(--radius) - 4px)",
        "radius-md": "calc(var(--radius) - 2px)",
        "radius-lg": "var(--radius)",
      },
      boxShadow: {
        sm: shadowTokens.sm,
        DEFAULT: shadowTokens.DEFAULT,
        md: shadowTokens.md,
        lg: shadowTokens.lg,
        xl: shadowTokens.xl,
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0px" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0px" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
