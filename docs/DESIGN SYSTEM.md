# VendoFlow Design System
## Stack: Next.js 15 · TypeScript · Tailwind CSS · Radix UI · shadcn/ui · Framer Motion
## Version: 2.0 — Amber/Gold accent, zinc dark back-office, light POS
## Last updated: 2026

---

## Theme Architecture

- **Back-office pages** (Dashboard, Products, Inventory Intelligence, Analytics,
  Purchasing, Customers, Staff, Settings, Multi-Store): DARK only
- **POS pages** (POSClient, Returns screen, PIN login): LIGHT only
- **No user-facing theme toggle** — theme is determined by route, not user preference
- POS light theme applied via `pos-theme` class on the root div of POS pages only

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
| Focus border | `border-amber-500/50` | #f59e0b at 50% |

### Text
| Role | Tailwind Class | Hex |
|---|---|---|
| Primary text | `text-zinc-50` | #fafafa |
| Secondary text | `text-zinc-400` | #a1a1aa |
| Muted / labels | `text-zinc-500` | #71717a |
| Disabled | `text-zinc-600` | #52525b |

### Accent — Amber/Gold
| Role | Tailwind Class | Hex |
|---|---|---|
| Accent text / icons | `text-amber-400` | #fbbf24 |
| Accent background | `bg-amber-400/10` | #fbbf24 at 10% |
| Accent border | `border-amber-400/20` | #fbbf24 at 20% |
| Primary button bg | `bg-amber-500` | #f59e0b |
| Primary button hover | `hover:bg-amber-400` | #fbbf24 |
| Primary button text | `text-zinc-950` | #09090b |
| Focus ring | `ring-amber-500/30` | #f59e0b at 30% |

### Status Colors — Dark
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
| Page background | `bg-[#f8f8f8]` | #f8f8f8 |
| Card / panels | `bg-white` | #ffffff |
| Sidebar / header | `bg-white` | #ffffff |
| Input background | `bg-white` | #ffffff |
| Hover state | `bg-zinc-100` | #f4f4f5 |

### Borders
| Role | Tailwind Class | Hex |
|---|---|---|
| Default border | `border-zinc-200` | #e4e4e7 |
| Subtle border | `border-zinc-100` | #f4f4f5 |
| Focus border | `border-amber-500/50` | #f59e0b at 50% |

### Text
| Role | Tailwind Class | Hex |
|---|---|---|
| Primary text | `text-zinc-900` | #18181b |
| Secondary text | `text-zinc-500` | #71717a |
| Muted | `text-zinc-400` | #a1a1aa |
| Disabled | `text-zinc-300` | #d4d4d8 |

### Accent — Amber/Gold (same across both themes)
| Role | Tailwind Class | Hex |
|---|---|---|
| Primary button bg | `bg-amber-500` | #f59e0b |
| Primary button hover | `hover:bg-amber-400` | #fbbf24 |
| Primary button text | `text-zinc-950` | #09090b |
| Focus ring | `ring-amber-500/30` | #f59e0b at 30% |

### Status Colors — POS Light
| State | Text | Background | Border |
|---|---|---|---|
| In stock | `text-emerald-700` | `bg-emerald-50` | `border-emerald-200` |
| Low stock | `text-amber-700` | `bg-amber-50` | `border-amber-200` |
| Out of stock | `text-red-700` | `bg-red-50` | `border-red-200` |

---

## Typography

### Fonts
- **UI font:** Geist Sans — all back-office and POS text
- **Mono font:** Geist Mono — SKUs, receipt numbers, barcodes, IDs, prices in tables

### Dark Scale (Back-office)
| Role | Classes |
|---|---|
| Page title | `text-2xl font-semibold tracking-tight text-zinc-50` |
| Section label | `text-xs font-medium uppercase tracking-widest text-zinc-500` |
| Card title | `text-sm font-semibold text-zinc-100` |
| Body | `text-sm text-zinc-300` |
| Caption / meta | `text-xs text-zinc-500` |
| Data value (KPI) | `text-2xl font-bold tabular-nums text-zinc-50` |
| Monospace (SKU/ID) | `font-mono text-xs text-zinc-400` |
| Link | `text-amber-400 hover:text-amber-300 underline-offset-4 hover:underline` |

### Light Scale (POS)
| Role | Classes |
|---|---|
| Page title | `text-xl font-semibold tracking-tight text-zinc-900` |
| Body | `text-sm text-zinc-700` |
| Caption | `text-xs text-zinc-500` |
| Price display | `text-2xl font-bold tabular-nums text-zinc-900` |
| Monospace (SKU) | `font-mono text-xs text-zinc-500` |

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
| Sidebar width | `w-60` fixed, never collapsible |

### POS Layout
| Role | Value |
|---|---|
| Root | `h-screen overflow-hidden` — no page scroll on POS ever |
| Left panel (products) | `flex-1 overflow-y-auto p-4` |
| Right panel (cart) | `w-96 fixed right-0 border-l border-zinc-200 overflow-y-auto p-4` |

---

## Component Rules

### Cards — Dark (Back-office)
```
bg-zinc-900 border border-zinc-800 rounded-xl
```
- Hover (clickable cards): `hover:border-zinc-700 transition-colors duration-150`
- Never use: `shadow-xl`, `rounded-2xl`, `bg-zinc-950` for cards, `bg-white`

### Cards — Light (POS)
```
bg-white border border-zinc-200 rounded-xl
```
- Hover: `hover:border-zinc-300 hover:shadow-sm transition-all duration-150`

---

### Buttons (both themes)
| Variant | Classes |
|---|---|
| Primary | `bg-amber-500 text-zinc-950 hover:bg-amber-400 rounded-lg h-9 px-4 text-sm font-medium transition-colors` |
| Secondary dark | `bg-zinc-800 text-zinc-100 border border-zinc-700 hover:bg-zinc-700 rounded-lg h-9 px-4 text-sm font-medium transition-colors` |
| Secondary light | `bg-white text-zinc-800 border border-zinc-200 hover:bg-zinc-50 rounded-lg h-9 px-4 text-sm font-medium transition-colors` |
| Ghost dark | `text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg h-9 px-4 text-sm transition-colors` |
| Ghost light | `text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg h-9 px-4 text-sm transition-colors` |
| Destructive | `bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded-lg h-9 px-4 text-sm transition-colors` |
| Compact | Add `h-8 px-3 text-xs` instead of `h-9 px-4 text-sm` |

**Never:** `rounded-full` buttons, gradient buttons, `shadow` on buttons

---

### Badges / Status Pills
- Shape: always `rounded-md` — never `rounded-full`
- Size: `text-xs font-medium px-2 py-0.5`

| Variant | Classes |
|---|---|
| Healthy / Success | `bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 rounded-md` |
| Warning / Low stock | `bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-md` |
| Dead stock / Error | `bg-red-400/10 text-red-400 border border-red-400/20 rounded-md` |
| Neutral | `bg-zinc-800 text-zinc-400 border border-zinc-700 rounded-md` |
| Accent | `bg-amber-400/10 text-amber-400 border border-amber-400/20 rounded-md` |
| POS In stock | `bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md` |
| POS Low stock | `bg-amber-50 text-amber-700 border border-amber-200 rounded-md` |
| POS Out of stock | `bg-red-50 text-red-700 border border-red-200 rounded-md` |

---

### Tables — Dark (Back-office)
```
Container:    bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden
Header row:   border-b border-zinc-800
Header cell:  text-xs font-medium uppercase tracking-widest text-zinc-500 px-4 py-3
Body row:     border-b border-zinc-800/50 hover:bg-zinc-800/50 transition-colors duration-100
Body cell:    text-sm text-zinc-300 px-4 py-3
Last row:     no border-b
```
- Always include: search top-left, filter/sort top-right
- Always include: pagination at bottom showing "X of Y results"
- Always include: empty state with icon + text + CTA (never a blank table)

---

### Inputs & Selects — Dark
```
bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-100
h-9 px-3 placeholder:text-zinc-500
focus:outline-none focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500/50
```

### Inputs & Selects — Light (POS)
```
bg-white border border-zinc-200 rounded-lg text-sm text-zinc-900
h-10 px-3 placeholder:text-zinc-400
focus:outline-none focus:ring-1 focus:ring-amber-500/30 focus:border-amber-500/50
```

---

### Sidebar — Dark
```
Container:     w-60 bg-zinc-950 border-r border-zinc-800 h-screen flex flex-col fixed left-0 top-0
Logo area:     px-4 py-5 border-b border-zinc-800
Nav section:   px-3 py-2
Section label: text-xs uppercase tracking-widest text-zinc-600 font-medium px-3 mb-1
Nav item:      flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400
               hover:text-zinc-100 hover:bg-zinc-800/50 transition-colors duration-150
Active item:   flex items-center gap-3 px-3 py-2 rounded-lg text-sm
               text-zinc-100 bg-zinc-800
Bottom area:   mt-auto px-4 py-4 border-t border-zinc-800
```

---

### Page Header — Dark (every back-office page)
```
Pattern:    flex items-start justify-between border-b border-zinc-800 pb-6 mb-6
Left:       page title (text-2xl font-semibold text-zinc-50) + optional subtitle (text-sm text-zinc-400)
Right:      primary action button
Breadcrumb: text-sm text-zinc-500 → text-zinc-300 (when nested pages)
```

---

### Heatmap — Inventory Intelligence
```
Grid container:   grid with gap-1
Column headers:   text-xs font-medium text-zinc-500 text-center pb-2
Row headers:      text-xs font-medium text-zinc-500 pr-3 flex items-center
Cell base:        rounded-md min-w-[64px] p-2 text-center text-xs font-medium cursor-default
Green cell:       bg-emerald-400/20 text-emerald-400 border border-emerald-400/30
Yellow cell:      bg-amber-400/20 text-amber-400 border border-amber-400/30
Red cell:         bg-red-400/20 text-red-400 border border-red-400/30
Empty/no data:    bg-zinc-800/50 text-zinc-600 border border-zinc-800
```

---

### Stat Cards — Dashboard
```
Container:   bg-zinc-900 border border-zinc-800 rounded-xl p-6
Label:       text-xs font-medium uppercase tracking-widest text-zinc-500 mb-3
Value:       text-2xl font-bold tabular-nums text-zinc-50 mb-1
Delta:       badge (success/warning/error) + text-xs text-zinc-500 ml-2
Icon:        w-4 h-4 text-zinc-500 (top right of card, optional)
```

---

## POS Screen Rules (critical — different from back-office)

```
Root wrapper:        pos-theme h-screen overflow-hidden bg-[#f8f8f8]
Header bar:          bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between
Left panel:          flex-1 bg-[#f8f8f8] overflow-y-auto p-4
Right panel (cart):  w-96 bg-white border-l border-zinc-200 flex flex-col h-full
Cart header:         px-4 py-4 border-b border-zinc-200
Cart items area:     flex-1 overflow-y-auto px-4
Cart footer:         px-4 py-4 border-t border-zinc-200 bg-white

Product card:        bg-white border border-zinc-200 rounded-xl p-3
                     hover:border-zinc-300 hover:shadow-sm cursor-pointer transition-all

Variant grid cell:   border rounded-lg px-3 py-2 text-sm font-medium cursor-pointer
  In stock:          border-zinc-200 bg-white text-zinc-900 hover:border-amber-500
  Selected:          border-amber-500 bg-amber-50 text-amber-700
  Out of stock:      border-zinc-100 bg-zinc-50 text-zinc-300 cursor-not-allowed

Checkout button:     w-full bg-amber-500 text-zinc-950 hover:bg-amber-400
                     rounded-xl h-12 text-base font-semibold transition-colors

Offline banner:      bg-amber-500/10 border border-amber-500/20 text-amber-700
                     text-xs font-medium px-3 py-2 rounded-lg
```

---

## Animation Rules (Framer Motion)

| Interaction | Values |
|---|---|
| Page enter | `opacity: 0→1, y: 8→0, duration: 0.2, ease: easeOut` |
| Card hover | `scale: 1→1.005, duration: 0.15` |
| Modal enter | `opacity: 0→1, scale: 0.97→1, duration: 0.15` |
| Sheet/drawer enter | `x: '100%'→0, duration: 0.2, ease: easeOut` |
| List stagger | `staggerChildren: 0.04` |
| Max duration | **200ms** — anything longer feels slow in a POS environment |

**Never:** bounce, spring on data components, rotate effects, delays over 100ms

---

## Icons

- **Library:** Lucide React — no exceptions, no other icon libraries
- **Default size:** `w-4 h-4`
- **Large size:** `w-5 h-5`
- **Color:** always inherit from parent text color, never hardcoded
- **Never:** mix with other icon libraries, use emoji as UI icons

---

## Tailwind Config Tokens

```ts
// tailwind.config.ts — add to theme.extend.colors
colors: {
  // Back-office surfaces
  'vf-bg':            '#09090b',
  'vf-surface':       '#18181b',
  'vf-elevated':      '#27272a',
  'vf-border':        '#27272a',
  'vf-border-strong': '#3f3f46',

  // POS surfaces
  'vf-pos-bg':        '#f8f8f8',
  'vf-pos-surface':   '#ffffff',
  'vf-pos-border':    '#e4e4e7',

  // Accent
  'vf-accent':        '#f59e0b',
  'vf-accent-hover':  '#fbbf24',
  'vf-accent-text':   '#09090b',
}
// Keep ALL default Tailwind colors — do not remove zinc, rose, emerald, amber, red, blue
```

---

## globals.css Variables

```css
:root {
  --background:          240 10% 3.9%;
  --foreground:          0 0% 98%;
  --card:                240 3.7% 10.9%;
  --card-foreground:     0 0% 98%;
  --border:              240 3.7% 15.9%;
  --input:               240 3.7% 15.9%;
  --primary:             38 92% 50%;
  --primary-foreground:  240 10% 3.9%;
  --secondary:           240 3.7% 15.9%;
  --secondary-foreground:0 0% 98%;
  --muted:               240 3.7% 15.9%;
  --muted-foreground:    240 5% 64.9%;
  --accent:              240 3.7% 15.9%;
  --accent-foreground:   0 0% 98%;
  --destructive:         0 84% 60%;
  --destructive-foreground: 0 0% 98%;
  --ring:                38 92% 50%;
  --radius:              0.5rem;
}

.pos-theme {
  --background:          0 0% 97%;
  --foreground:          240 10% 3.9%;
  --card:                0 0% 100%;
  --card-foreground:     240 10% 3.9%;
  --border:              240 5.9% 90%;
  --input:               0 0% 100%;
  --primary:             38 92% 50%;
  --primary-foreground:  240 10% 3.9%;
  --muted:               240 4.8% 95.9%;
  --muted-foreground:    240 3.8% 46.1%;
  --ring:                38 92% 50%;
}
```

---

## Token Migration Map (old → new)

Use this when updating existing files. For all back-office files:

| Old token | New token |
|---|---|
| `bg-background-dark` | `bg-zinc-950` |
| `bg-background-light` | `bg-zinc-950` (back-office) |
| `bg-background-card-dark` | `bg-zinc-900` |
| `bg-background-card-light` | `bg-zinc-900` (back-office) |
| `bg-background-hover` | `bg-zinc-800/50` |
| `border-border-dark` | `border-zinc-800` |
| `border-border-light` | `border-zinc-800` (back-office) |
| `text-text-primary-dark` | `text-zinc-50` |
| `text-text-primary-light` | `text-zinc-50` (back-office) |
| `text-text-secondary` | `text-zinc-400` |
| `bg-primary` | `bg-amber-500` |
| `text-primary` (accent) | `text-amber-400` |
| `hover:bg-primary-hover` | `hover:bg-amber-400` |
| `ring-primary` | `ring-amber-500/30` |
| `bg-semantic-error` | `bg-red-400/10 text-red-400` |
| `bg-semantic-success` | `bg-emerald-400/10 text-emerald-400` |
| `bg-semantic-warning` | `bg-amber-400/10 text-amber-400` |
| `#25291c` (green page) | `#09090b` |
| `#2f3326` (green card) | `#18181b` |
| `#6b0005` (burgundy) | `#f59e0b` |

For POS files only (app/pos/*, components/pos/*):

| Old token | New token |
|---|---|
| `bg-background-dark` | `bg-[#f8f8f8]` |
| `bg-background-card-dark` | `bg-white` |
| `border-border-dark` | `border-zinc-200` |
| `text-text-primary-dark` | `text-zinc-900` |
| `text-text-secondary` | `text-zinc-500` |

---

## What Cursor Must Never Do

- Never use old green tokens: `#25291c`, `#2f3326`, `bg-background-dark`, `bg-background-light`
- Never use old burgundy: `#6b0005`, `bg-primary` with the old red value
- Never use `bg-white` or `bg-gray-*` in dark back-office pages
- Never use `rounded-full` on buttons or badges
- Never use `shadow-xl` or `drop-shadow` on cards in dark theme
- Never create custom hex colors outside this token system
- Never use inline styles
- Never mix Lucide with any other icon library
- Never build a component that already exists in shadcn/ui
- Never apply dark theme classes to POS pages
- Never apply light theme classes to back-office pages
- Never add a theme toggle — theme is route-based, not user-controlled

---

## Page List & Theme Assignment

| Page / File | Theme |
|---|---|
| app/dashboard/* | DARK |
| app/products/* | DARK |
| app/inventory/* | DARK |
| app/purchasing/* | DARK |
| app/sales/* | DARK |
| app/customers/* | DARK |
| app/settings/* | DARK |
| app/stores/* | DARK |
| components/AppShell.tsx | DARK |
| app/pos/* | LIGHT (pos-theme) |
| components/pos/* | LIGHT (pos-theme) |
| app/auth/* | DARK |
| app/login/* | DARK |
| app/signup/* | DARK |
| app/onboarding/* | DARK |