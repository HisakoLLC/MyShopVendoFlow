# VendoFlow Web App — Design System v3.0
## Stack: Next.js 15 · TypeScript · Tailwind CSS · Radix UI · shadcn/ui · Framer Motion
## Theme: Editorial Monochrome — Vogue-inspired webapp aesthetic with functional color
## Last updated: March 2026

---

## Design Philosophy

The webapp shares its brand DNA with the VendoFlow landing page — editorial,
sharp, fashion-forward. The difference is purpose: the landing page is a
showroom, the webapp is a workshop used 8 hours a day by boutique owners
and cashiers.

The editorial aesthetic applies to: typography, geometry, spacing, layout,
and the monochrome foundation.

Functional color is kept for: inventory status, alerts, chart data, and
one single primary action accent per page. Color is a tool here, not decoration.

---

## Theme Architecture

- **Back-office pages** (Dashboard, Products, Inventory, Analytics,
  Purchasing, Customers, Staff, Settings, Multi-Store): DARK only
- **POS pages** (POSClient, Returns, PIN login): LIGHT only
- **No user-facing theme toggle** — theme is determined by route
- POS light theme applied via `pos-theme` class on root div of POS pages only

---

## DARK THEME — Back-Office

### Backgrounds
| Role | Tailwind Class | Hex |
|---|---|---|
| Page background | `bg-zinc-950` | #09090b |
| Card / surface | `bg-zinc-900` | #18181b |
| Elevated surface | `bg-zinc-800` | #27272a |
| Hover state | `bg-zinc-800/50` | #27272a at 50% |
| Input background | `bg-zinc-900` | #18181b |

### Borders
| Role | Tailwind Class | Hex |
|---|---|---|
| Default border | `border-zinc-800` | #27272a |
| Subtle border | `border-zinc-900` | #18181b |
| Strong border | `border-zinc-700` | #3f3f46 |
| Focus border | `border-white/50` | white at 50% |

### Text
| Role | Tailwind Class | Hex |
|---|---|---|
| Primary text | `text-zinc-50` | #fafafa |
| Secondary text | `text-zinc-400` | #a1a1aa |
| Muted / eyebrow | `text-zinc-500` | #71717a |
| Disabled | `text-zinc-600` | #52525b |

### Accent — Single, on primary CTA buttons only
| Role | Tailwind Class | Hex |
|---|---|---|
| Primary button bg | `bg-white` | #ffffff |
| Primary button text | `text-zinc-950` | #09090b |
| Primary button hover | `hover:bg-zinc-100` | #f4f4f5 |
| Focus ring | `ring-white/30` | white at 30% |

> The accent is white-on-dark. Clean, editorial, premium.
> No amber, no color on buttons in back-office.
> Color is reserved exclusively for status indicators.

### Status Colors — Dark (functional, never decorative)
| State | Text | Background | Border |
|---|---|---|---|
| Success / Healthy | `text-emerald-400` | `bg-emerald-400/10` | `border-emerald-400/20` |
| Warning / Low stock | `text-amber-400` | `bg-amber-400/10` | `border-amber-400/20` |
| Error / Dead stock | `text-red-400` | `bg-red-400/10` | `border-red-400/20` |
| Info | `text-blue-400` | `bg-blue-400/10` | `border-blue-400/20` |
| Neutral | `text-zinc-400` | `bg-zinc-800` | `border-zinc-700` |

---

## LIGHT THEME — POS Only

### Backgrounds
| Role | Tailwind Class | Hex |
|---|---|---|
| Page background | `bg-zinc-50` | #fafafa |
| Card / panels | `bg-white` | #ffffff |
| Header / sidebar | `bg-white` | #ffffff |
| Input background | `bg-white` | #ffffff |
| Hover state | `bg-zinc-100` | #f4f4f5 |

### Borders
| Role | Tailwind Class | Hex |
|---|---|---|
| Default border | `border-zinc-200` | #e4e4e7 |
| Subtle border | `border-zinc-100` | #f4f4f5 |
| Strong border | `border-zinc-300` | #d4d4d8 |
| Focus border | `border-zinc-900` | #18181b |

### Text
| Role | Tailwind Class | Hex |
|---|---|---|
| Primary text | `text-zinc-900` | #18181b |
| Secondary text | `text-zinc-500` | #71717a |
| Muted | `text-zinc-400` | #a1a1aa |
| Disabled | `text-zinc-300` | #d4d4d8 |

### Accent — POS Primary CTA only
| Role | Tailwind Class | Hex |
|---|---|---|
| Primary button bg | `bg-zinc-900` | #18181b |
| Primary button text | `text-white` | #ffffff |
| Primary button hover | `hover:bg-zinc-800` | #27272a |
| Focus ring | `ring-zinc-900/20` | |

### Status Colors — POS Light (functional)
| State | Text | Background | Border |
|---|---|---|---|
| In stock | `text-emerald-700` | `bg-emerald-50` | `border-emerald-200` |
| Low stock | `text-amber-700` | `bg-amber-50` | `border-amber-200` |
| Out of stock | `text-zinc-400` | `bg-zinc-100` | `border-zinc-200` |

---

## Typography

### Fonts
- **Display / Editorial:** Playfair Display — page titles, section headers,
  large KPI numbers, pull quotes only
- **UI / Body:** Geist Sans — all other text, labels, buttons, captions,
  table content
- **Mono:** Geist Mono — SKUs, receipt numbers, barcodes, IDs, prices in tables

### Font Loading (app/layout.tsx)
```tsx
import { Playfair_Display } from 'next/font/google'
import localFont from 'next/font/local'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})
```

### Tailwind Font Config
```ts
fontFamily: {
  editorial: ['var(--font-playfair)', 'Georgia', 'serif'],
  sans:      ['var(--font-geist)', 'Inter', 'system-ui', 'sans-serif'],
  mono:      ['Geist Mono', 'JetBrains Mono', 'monospace'],
}
```

### Dark Type Scale (Back-office)
| Role | Classes |
|---|---|
| Page title | `font-editorial text-3xl font-bold leading-tight tracking-tight text-zinc-50` |
| Section eyebrow | `text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-zinc-500` |
| Card title | `text-sm font-semibold text-zinc-100` |
| Body | `text-sm text-zinc-300 leading-relaxed` |
| Caption / meta | `text-xs text-zinc-500` |
| Data value (KPI) | `font-editorial text-3xl font-bold tabular-nums text-zinc-50` |
| Monospace (SKU/ID) | `font-mono text-xs text-zinc-400` |
| Table header | `text-[0.65rem] font-semibold tracking-[0.15em] uppercase text-zinc-500` |
| Link | `text-zinc-300 hover:text-zinc-50 underline-offset-4 hover:underline` |

### Light Type Scale (POS)
| Role | Classes |
|---|---|
| Page title | `font-editorial text-2xl font-bold leading-tight text-zinc-900` |
| Body | `text-sm text-zinc-600 leading-relaxed` |
| Caption | `text-xs text-zinc-400` |
| Price display | `font-editorial text-2xl font-bold tabular-nums text-zinc-900` |
| Monospace (SKU) | `font-mono text-xs text-zinc-500` |

---

## Geometry — Editorial Sharpness

Less rounding = more editorial. More rounding = more generic SaaS.

| Element | Border Radius | Class |
|---|---|---|
| Cards | Sharp medium | `rounded-lg` (8px) |
| Buttons | Sharp | `rounded-sm` (2px) |
| Badges / pills | Sharp | `rounded-sm` (2px) |
| Inputs | Sharp medium | `rounded-md` (6px) |
| Modals | Sharp medium | `rounded-xl` (12px) |
| Avatars | Sharp | `rounded-md` (6px) |
| POS variant cells | Sharp medium | `rounded-lg` (8px) |

Never use `rounded-full` on any interactive element.
Never use `rounded-2xl` or `rounded-3xl` anywhere.

---

## Spacing & Layout

### Back-Office
| Role | Value |
|---|---|
| Page padding | `px-8 py-8` |
| Card padding standard | `p-6` |
| Card padding compact | `p-4` |
| Section gap | `space-y-6` |
| Card grid gap | `gap-4` |
| Sidebar width | `w-60` fixed |

### POS Layout
| Role | Value |
|---|---|
| Root | `h-screen overflow-hidden` |
| Left panel | `flex-1 overflow-y-auto p-4` |
| Right panel (cart) | `w-96 border-l border-zinc-200 flex flex-col h-full` |

---

## Component Rules

### Cards — Dark
```
bg-zinc-900 border border-zinc-800 rounded-lg
```
- Hover (clickable): `hover:border-zinc-700 transition-colors duration-150`
- Never: `shadow-xl`, `rounded-2xl`, `bg-zinc-950` for cards

### Cards — Light (POS)
```
bg-white border border-zinc-200 rounded-lg
```
- Hover: `hover:border-zinc-400 transition-colors duration-150`

---

### Buttons

| Variant | Classes |
|---|---|
| **Primary dark** | `bg-white text-zinc-950 hover:bg-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors` |
| **Primary light (POS)** | `bg-zinc-900 text-white hover:bg-zinc-800 rounded-sm h-10 px-5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors` |
| **Secondary dark** | `bg-transparent text-zinc-300 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-100 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors` |
| **Secondary light** | `bg-transparent text-zinc-700 border border-zinc-300 hover:border-zinc-700 hover:text-zinc-900 rounded-sm h-9 px-5 text-xs font-semibold tracking-[0.12em] uppercase transition-colors` |
| **Ghost dark** | `text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-sm h-9 px-4 text-xs font-semibold uppercase tracking-[0.1em] transition-colors` |
| **Destructive** | `bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-sm h-9 px-4 text-xs font-semibold uppercase transition-colors` |
| **Compact** | Replace `h-9` with `h-7 px-3` |

Never: `rounded-full`, gradients, `shadow`, `hover:scale-*`

---

### Badges / Status Pills

Shape: always `rounded-sm` — never `rounded-full` or `rounded-md`
Size: `text-[0.65rem] font-semibold tracking-[0.1em] uppercase px-2 py-0.5`

| Variant | Classes |
|---|---|
| Healthy / In stock | `bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 rounded-sm` |
| Warning / Low stock | `bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-sm` |
| Dead stock / Error | `bg-red-400/10 text-red-400 border border-red-400/20 rounded-sm` |
| Neutral | `bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-sm` |
| POS In stock | `bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-sm` |
| POS Low stock | `bg-amber-50 text-amber-700 border border-amber-200 rounded-sm` |
| POS Out of stock | `bg-zinc-100 text-zinc-400 border border-zinc-200 rounded-sm` |

---

### Tables — Dark

```
Container:    bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden
Header row:   border-b border-zinc-800
Header cell:  text-[0.65rem] font-semibold tracking-[0.15em] uppercase
              text-zinc-500 px-4 py-3
Body row:     border-b border-zinc-800/50 hover:bg-zinc-800/50
              transition-colors duration-100
Body cell:    text-sm text-zinc-300 px-4 py-3
Last row:     no border-b
```

Always include: search top-left, filter/sort top-right, pagination bottom.
Empty state: icon + eyebrow + text + CTA — never a blank table.

---

### Inputs — Dark
```
bg-zinc-900 border border-zinc-800 rounded-md text-sm text-zinc-100
h-9 px-3 placeholder:text-zinc-600
focus:outline-none focus:ring-1 focus:ring-white/20 focus:border-zinc-600
```

### Inputs — Light (POS)
```
bg-white border border-zinc-200 rounded-md text-sm text-zinc-900
h-10 px-3 placeholder:text-zinc-400
focus:outline-none focus:ring-1 focus:ring-zinc-900/20 focus:border-zinc-900
```

---

### Sidebar — Dark
```
Container:   w-60 bg-zinc-950 border-r border-zinc-800
             h-screen flex flex-col fixed left-0 top-0 z-40

Logo area:   px-5 py-5 border-b border-zinc-800
Wordmark:    font-editorial text-lg font-bold text-zinc-50
Store name:  text-[0.65rem] font-semibold tracking-[0.15em] uppercase
             text-zinc-600 mt-1

Section label: text-[0.6rem] font-semibold tracking-[0.2em] uppercase
               text-zinc-600 px-4 pt-5 pb-2

Nav item:    flex items-center gap-3 px-4 py-2.5
             text-xs font-semibold tracking-[0.1em] uppercase
             text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800/50
             transition-colors duration-150

Active item: flex items-center gap-3 px-4 py-2.5
             text-xs font-semibold tracking-[0.1em] uppercase
             text-zinc-100 bg-zinc-800 border-l-2 border-l-white

Bottom:      mt-auto px-5 py-4 border-t border-zinc-800
Username:    text-xs font-semibold text-zinc-300
Role:        text-[0.65rem] tracking-[0.1em] uppercase text-zinc-600
```

---

### Page Header — Dark (every back-office page)
```
flex items-start justify-between pb-6 mb-6 border-b border-zinc-800

Left:
  Eyebrow:  text-[0.65rem] font-semibold tracking-[0.2em] uppercase
            text-zinc-500 mb-2
  Title:    font-editorial text-3xl font-bold text-zinc-50 leading-tight

Right: primary action button (white bg, zinc-950 text, rounded-sm)
```

### Hairline Rule (editorial section separator)
```html
<div className="w-full h-px bg-zinc-800 my-6" />
```

---

### Stat Cards — Dashboard
```
bg-zinc-900 border border-zinc-800 rounded-lg p-6
hover:border-zinc-700 transition-colors

Eyebrow:   text-[0.65rem] font-semibold tracking-[0.2em] uppercase
           text-zinc-500 mb-4
Value:     font-editorial text-3xl font-bold tabular-nums text-zinc-50
Delta:     status badge rounded-sm + text-xs text-zinc-500
```

---

### Heatmap — Inventory Intelligence
```
Headers:    text-[0.65rem] font-semibold tracking-[0.15em] uppercase
            text-zinc-500
Cell base:  rounded-sm min-w-[64px] p-2 text-center
            text-[0.65rem] font-semibold tracking-[0.08em] uppercase
Green:      bg-emerald-400/20 text-emerald-400 border border-emerald-400/30
Yellow:     bg-amber-400/20 text-amber-400 border border-amber-400/30
Red:        bg-red-400/20 text-red-400 border border-red-400/30
Empty:      bg-zinc-800/50 text-zinc-600 border border-zinc-800
```

---

## POS Screen Rules

```
Root:           pos-theme h-screen overflow-hidden bg-zinc-50

Header:         bg-white border-b border-zinc-200 px-5 h-14
                flex items-center justify-between
Store label:    text-[0.6rem] font-semibold tracking-[0.2em] uppercase
                text-zinc-400
Store name:     text-sm font-semibold text-zinc-900

Search:         bg-white border border-zinc-200 rounded-md h-11
                text-sm placeholder:text-zinc-400
                focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900/10

Product card:   bg-white border border-zinc-200 rounded-lg p-3
                hover:border-zinc-400 cursor-pointer transition-colors
Product name:   text-xs font-semibold tracking-[0.05em] uppercase text-zinc-800
Price:          font-editorial text-base font-bold text-zinc-900

Variant cell in stock:    bg-white border border-zinc-200 rounded-lg
                          px-3 py-2.5 text-sm font-medium text-zinc-900
                          hover:border-zinc-900 transition-colors
Variant cell selected:    bg-zinc-900 border border-zinc-900 rounded-lg
                          px-3 py-2.5 text-sm font-medium text-white
Variant cell out of stock: bg-zinc-50 border border-zinc-100 rounded-lg
                           px-3 py-2.5 text-sm text-zinc-300 cursor-not-allowed

Cart header:    px-5 py-4 border-b border-zinc-200
                text-xs font-semibold tracking-[0.15em] uppercase text-zinc-500
Cart total:     font-editorial text-2xl font-bold text-zinc-900

Checkout btn:   w-full bg-zinc-900 text-white hover:bg-zinc-800
                rounded-sm h-12 text-xs font-semibold
                tracking-[0.15em] uppercase transition-colors
```

---

## Animation Rules (Framer Motion)

| Interaction | Values |
|---|---|
| Page enter | `opacity: 0→1, y: 6→0, duration: 0.18, ease: easeOut` |
| Card hover | `scale: 1→1.002, duration: 0.15` |
| Modal enter | `opacity: 0→1, scale: 0.98→1, duration: 0.15` |
| Sheet enter | `x: '100%'→0, duration: 0.18` |
| Max duration | **180ms** |

Never: bounce, spring on data, rotate, scale over 1.01

---

## Icons
- Library: Lucide React only
- Default: `w-4 h-4`
- Large: `w-5 h-5`
- In buttons: `w-3.5 h-3.5`
- Color: always inherit

---

## globals.css

```css
:root {
  --background:           240 10% 3.9%;
  --foreground:           0 0% 98%;
  --card:                 240 3.7% 10.9%;
  --card-foreground:      0 0% 98%;
  --border:               240 3.7% 15.9%;
  --input:                240 3.7% 15.9%;
  --primary:              0 0% 98%;
  --primary-foreground:   240 10% 3.9%;
  --secondary:            240 3.7% 15.9%;
  --secondary-foreground: 0 0% 98%;
  --muted:                240 3.7% 15.9%;
  --muted-foreground:     240 5% 64.9%;
  --accent:               240 3.7% 15.9%;
  --accent-foreground:    0 0% 98%;
  --destructive:          0 84% 60%;
  --destructive-foreground: 0 0% 98%;
  --ring:                 0 0% 98%;
  --radius:               0.125rem;
}

.pos-theme {
  --background:           0 0% 98%;
  --foreground:           240 10% 3.9%;
  --card:                 0 0% 100%;
  --card-foreground:      240 10% 3.9%;
  --border:               240 5.9% 90%;
  --input:                0 0% 100%;
  --primary:              240 10% 3.9%;
  --primary-foreground:   0 0% 98%;
  --muted:                240 4.8% 95.9%;
  --muted-foreground:     240 3.8% 46.1%;
  --ring:                 240 10% 3.9%;
}
```

---

## Token Migration: v2 Amber → v3 Editorial

| Old v2 | New v3 |
|---|---|
| `bg-amber-500` on buttons | `bg-white` (dark) / `bg-zinc-900` (POS) |
| `hover:bg-amber-400` | `hover:bg-zinc-100` (dark) / `hover:bg-zinc-800` (POS) |
| `ring-amber-500/30` | `ring-white/20` (dark) / `ring-zinc-900/20` (POS) |
| `text-amber-400` accent | remove — amber = warning status only |
| `bg-amber-400/10` accent bg | remove — amber = warning status only |
| `rounded-xl` buttons | `rounded-sm` |
| `rounded-full` badges | `rounded-sm` |
| `text-2xl` KPI values | `font-editorial text-3xl` |
| `text-xs uppercase tracking-widest` | `text-[0.65rem] tracking-[0.2em] uppercase` |
| Page title `font-semibold text-2xl` | `font-editorial font-bold text-3xl` |

---

## What Cursor Must Never Do

- Never use `bg-amber-500` or `text-amber-400` as accent — amber is warning only
- Never use `rounded-full` on buttons, badges, or interactive elements
- Never use `rounded-2xl` or `rounded-3xl` anywhere
- Never use `shadow-xl` or `drop-shadow` on cards
- Never use `font-editorial` below `text-xl`
- Never use `font-editorial` on body copy, table cells, or labels
- Never use inline styles
- Never mix Lucide with other icon libraries
- Never build a component that exists in shadcn/ui
- Never apply dark theme to POS pages
- Never apply light theme to back-office pages
- Never add a theme toggle
- Never use `bg-white` in dark back-office pages
- Never use `bg-zinc-950` for card surfaces — only `bg-zinc-900`