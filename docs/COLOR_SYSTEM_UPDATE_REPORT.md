# VendoFlow Color Palette Update Report

**Date:** February 3, 2025  
**Design system:** Primary #6b0005 (dark burgundy), light page #e6e1de, dark page #25291c, cards white / #2f3326

---

## 1. Configuration & Theme

| File | Changes |
|------|---------|
| **tailwind.config.ts** | Added full design system to `theme.extend.colors`: `primary` (DEFAULT, hover, active, disabled), `background` (light, dark, card.light, card.dark, hover), `text-primary`, `text-secondary`, `text-tertiary`, `border` (light, dark, divider), `semantic` (success, warning, error, info). Kept legacy/shadcn keys for compatibility. |
| **app/globals.css** | Replaced HSL variables with new CSS variables: `--primary`, `--primary-hover`, `--primary-active`, `--background`, `--background-card`, `--text-primary`, `--text-secondary`, `--border`, semantic colors. Added `:root` and `.dark` blocks. Body now uses `bg-background-light` / `dark:bg-background-dark` and `text-text-primary-light` / `dark:text-text-primary-dark`. |
| **public/site.webmanifest** | `theme_color`: #8c0007 → #6b0005; `background_color`: #ffffff → #e6e1de. |

---

## 2. UI Components (components/ui)

| File | Changes |
|------|---------|
| **button.tsx** | Primary: `bg-primary text-white hover:bg-primary-hover active:bg-primary-active disabled:bg-primary-disabled`, focus ring `ring-primary`. Secondary: border-primary, hover fill. Outline: border + card background + hover. Ghost: background-hover. Destructive: `bg-semantic-error`. |
| **card.tsx** | `bg-background-card-light` / `dark:bg-background-card-dark`, `border-border-light` / `dark:border-border-dark`, `text-text-primary-light` / `dark:text-text-primary-dark`, description uses text-secondary. |
| **input.tsx** | Border, background-card, placeholder and focus ring use design tokens (border-light, background-card-light, text-secondary, ring-primary). |
| **textarea.tsx** | Same as input (border, background-card, placeholder, focus ring). |
| **select.tsx** | Trigger and content use border-light, background-card-light, text-primary, focus ring primary; divider uses border-divider. |
| **alert.tsx** | Default variant uses background-card and text-primary (light/dark). |
| **alert-dialog.tsx** | Content: border-border-light, bg-background-card-light, dark variants; description text-secondary. |
| **dialog.tsx** | Content bg-background-card, border-border; description text-secondary; close button focus ring-primary. |
| **sheet.tsx** | Content bg-background-card; title text-primary; description text-secondary; close focus ring-primary. |
| **dropdown-menu.tsx** | Content border-border, bg-background-card, text-primary; item focus bg-background-hover; separator border-divider; label text-primary. |
| **popover.tsx** | Content border-border, bg-background-card, text-primary. |
| **tabs.tsx** | List bg-background-hover, text-secondary; trigger active state bg-background-card and text-primary; focus ring-primary. |
| **badge.tsx** | Default: bg-primary text-white. Secondary: background-hover + text-primary. Destructive: bg-semantic-error. Outline: text-primary. |
| **checkbox.tsx** | Border-border, focus ring-primary, checked bg-primary text-white. |
| **radio-group.tsx** | Border-border, text-primary, focus ring-primary. |
| **form.tsx** | Description text-secondary. |
| **label.tsx** | text-text-primary (light/dark). |
| **table.tsx** | Header bg-background-hover; heading text-secondary; caption text-secondary. |
| **skeleton.tsx** | bg-border-divider (light/dark). |
| **switch.tsx** | Thumb bg-background-card (light/dark). |

---

## 3. App Pages & Layouts

| File | Changes |
|------|---------|
| **app/globals.css** | Body: bg-background-light, dark:bg-background-dark, text-text-primary (light/dark). |
| **app/auth/pin-login/page.tsx** | Page wrapper bg-background-light/dark; card containers bg-background-card; remaining dark:bg-background → dark:bg-background-card-dark; borders to border-dark where applicable. |
| **app/auth/callback/page.tsx** | Page wrappers bg-background-light/dark; form card bg-background-card. |
| **app/login/page.tsx** | Page wrappers bg-background-light/dark; form cards bg-background-card; dark:bg-background/50 → dark:bg-background-card-dark/50. |
| **app/signup/page.tsx** | Page wrapper bg-background-light/dark; form card bg-background-card. |
| **app/onboarding/page.tsx** | Page wrappers bg-background-light/dark. |
| **app/pos/page.tsx** | Page wrapper bg-background-light/dark; form card bg-background-card. |
| **app/pos/BindStaffThenPOS.tsx** | Page wrapper bg-background-light/dark; form card bg-background-card. |
| **app/pos/POSClient.tsx** | Main area bg-background-light/dark; header and sidebar panels bg-background-card, border-border. |
| **app/dashboard/page.tsx** | Main wrapper bg-background-light/dark. |
| **app/sales/sales-report-client.tsx** | Main wrapper bg-background-light/dark. |
| **app/inventory/intelligence/intelligence-client.tsx** | Main wrapper bg-background-light/dark. |
| **app/error.tsx** | Page wrapper bg-background-light/dark. |
| **app/purchasing/[po_id]/print/print-po-client.tsx** | Page bg-background-light/dark, text-text-primary; toolbar border-border, bg-background-card. |
| **app/purchasing/error.tsx** | Card bg-background-card; text to text-primary/dark. |

---

## 4. App Feature Modules (cards, tables, modals)

| File | Changes |
|------|---------|
| **app/purchasing/[po_id]/receive/receive-inventory-form.tsx** | Section cards bg-background-card, border-border. |
| **app/inventory/transfer/transfer-inventory-form.tsx** | Dropdown and section cards bg-background-card, border-border. |
| **app/customers/customers-list.tsx** | Empty state and table container bg-background-card, border-border. |
| **app/inventory/transfers/transfers-list.tsx** | Empty state and table containers bg-background-card, border-border. |
| **app/settings/receipt-preview.tsx** | Preview container bg-background-card, border-border. |
| **app/settings/business-profile-tab.tsx** | Form card bg-background-card, border-border. |
| **app/settings/receipt-customization-tab.tsx** | Section cards bg-background-card, border-border. |
| **app/settings/staff/staff-list.tsx** | Empty state and table cards bg-background-card, border-border. |
| **app/purchasing/page.tsx** | Stat and list cards bg-background-card, border-border. |
| **app/purchasing/[po_id]/page.tsx** | Detail and list cards bg-background-card, border-border. |
| **app/purchasing/[po_id]/receive/page.tsx** | Form card bg-background-card, border-border. |
| **app/purchasing/restock/restock-suggestions-client.tsx** | Card bg-background-card, border-border. |
| **app/purchasing/new/create-po-form.tsx** | Form sections bg-background-card, border-border. |
| **app/inventory/inventory-table-client.tsx** | Filters card, table container, AlertDialog content bg-background-card, border-border. |
| **app/products/products-table-client.tsx** | Sticky header bg-background-card/80; empty state, table container, AlertDialogs, inline buttons and inputs use background-card, border-border, text-primary/secondary; dark placeholders (bg-background/40, etc.) → background-card-dark. |

---

## 5. Shared Components (non-ui)

| File | Changes |
|------|---------|
| **components/AppShell.tsx** | Sidebar bg-background-card, border-border; main content wrapper bg-background-light/dark. |
| **components/EmptyState.tsx** | Container bg-background-card, border-border. |
| **components/pos/Receipt.tsx** | Receipt container bg-background-card, print:bg-white; dark:bg-background-card-dark. |
| **components/dashboard/DashboardMetrics.tsx** | Chart backgroundColor remains #e6e1de (matches light page). |
| **components/dashboard/DashboardCharts.tsx** | Chart backgroundColor remains #e6e1de. |

---

## 6. Summary

- **Config / global:** 3 files (tailwind.config.ts, app/globals.css, public/site.webmanifest).
- **UI components:** 20 files under `components/ui`.
- **App pages/layouts:** 14 files under `app` (auth, pos, dashboard, sales, inventory, error, purchasing print).
- **App feature modules:** 15 files (purchasing, inventory, settings, customers, products).
- **Shared components:** 5 files (AppShell, EmptyState, pos/Receipt, dashboard charts/metrics).

**Total files updated:** 57+

---

## 7. Design Token Reference

- **Primary:** #6b0005 (hover #4d0003, active #3a0002, disabled rgba(107,0,5,0.4)).
- **Backgrounds:** Light page #e6e1de, light card #FFFFFF, dark page #25291c, dark card #2f3326.
- **Text:** On light – primary #25291c, secondary #6b6b6b, tertiary #9ca3af; on dark – primary #e6e1de, secondary #a8a8a8, tertiary #6b7280; on primary button – #FFFFFF.
- **Borders:** Light #d4d4d4, dark #404040; focus ring #6b0005 (3px).
- **Semantic:** Success #2d5016, warning #d97706, error #dc2626, info #1e3a8a (with light backgrounds as specified).

All new usage uses Tailwind classes from the theme (e.g. `bg-primary`, `bg-background-card-light`, `text-text-primary-light`, `border-border-light`) with no raw hex in classNames.
