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
        /* VendoFlow design system */
        primary: {
          DEFAULT: "#6b0005",
          hover: "#4d0003",
          active: "#3a0002",
          disabled: "rgba(107, 0, 5, 0.4)",
          foreground: "#ffffff",
        },
        background: {
          DEFAULT: "#e6e1de",
          light: "#e6e1de",
          dark: "#25291c",
          card: {
            light: "#FFFFFF",
            dark: "#2f3326",
          },
          hover: {
            light: "#f5f5f5",
            dark: "#3a3f2e",
          },
        },
        "text-primary": {
          light: "#25291c",
          dark: "#e6e1de",
        },
        "text-secondary": {
          light: "#6b6b6b",
          dark: "#a8a8a8",
        },
        "text-tertiary": {
          light: "#9ca3af",
          dark: "#6b7280",
        },
        border: {
          DEFAULT: "#d4d4d4",
          light: "#d4d4d4",
          dark: "#404040",
          divider: {
            light: "#e5e5e5",
            dark: "#333333",
          },
        },
        semantic: {
          success: {
            DEFAULT: "#2d5016",
            light: "#dcfce7",
          },
          warning: {
            DEFAULT: "#d97706",
            light: "#fef3c7",
          },
          error: {
            DEFAULT: "#dc2626",
            light: "#fee2e2",
          },
          info: {
            DEFAULT: "#1e3a8a",
            light: "#dbeafe",
          },
        },
        /* Legacy/shadcn compatibility */
        input: "#d4d4d4",
        ring: "#6b0005",
        foreground: "#25291c",
        secondary: {
          DEFAULT: "#6b6b6b",
          foreground: "#e6e1de",
        },
        destructive: {
          DEFAULT: "#dc2626",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#f5f5f5",
          foreground: "#6b6b6b",
        },
        accent: {
          DEFAULT: "#f5f5f5",
          foreground: "#25291c",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#25291c",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#25291c",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
