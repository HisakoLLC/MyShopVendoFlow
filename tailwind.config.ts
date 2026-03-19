import type { Config } from "tailwindcss"

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
        // Back-office surfaces
        "vf-bg": "#09090b",
        "vf-surface": "#18181b",
        "vf-elevated": "#27272a",
        "vf-border": "#27272a",
        "vf-border-strong": "#3f3f46",

        // POS surfaces
        "vf-pos-bg": "#f8f8f8",
        "vf-pos-surface": "#ffffff",
        "vf-pos-border": "#e4e4e7",

        // Accent
        "vf-accent": "#f59e0b",
        "vf-accent-hover": "#fbbf24",
        "vf-accent-text": "#09090b",

        // shadcn/ui border token
        border: "hsl(var(--border))",
      },
      fontFamily: {
        editorial: ["var(--font-playfair)", "Georgia", "serif"],
      },
      borderRadius: {
        sm: "2px",
        md: "6px",
        lg: "8px",
        xl: "12px",
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
