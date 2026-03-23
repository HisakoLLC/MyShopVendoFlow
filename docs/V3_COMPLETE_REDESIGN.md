# VendoFlow V3: Comprehensive UI Transformation

This document serves as the primary technical and visual reference for the **VendoFlow V3** redesign, completed in March 2026. The goal was to transform VendoFlow into a high-end, editorial-style management platform for high-fashion boutiques.

## 1. Core Design Principles
VendoFlow V3 is built on a custom monochromatic design system inspired by high-fashion magazines (Vogue, Harper's Bazaar).

- **Monochromatic Palette**: Strict use of Zinc-950, Zinc-900, and White. All past amber, gold, or burgundy accents have been removed.
- **Editorial Typography**: 
    - **Headers**: `font-editorial` (Playfair Display) from Google Fonts.
    - **Interface**: `font-sans` (Geist/Inter) for legibility.
- **Sharp Modernism**: `rounded-sm` (2px-4px) radius on all buttons and inputs. Thin `zinc-800` borders on all container elements.

---

## 2. Authentication Experience (Auth UI)
The Login and Signup pages were rebuilt to mirror the "two-column" layout of industry leaders like **Dodo Payments**.

- **Two-Column Layout**: A modern dual-pane design on desktop.
- **Dedicated Staff Entry**: A "Login with PIN" link is now visible on the main login screen, leading to a specialized staff portal.
- **Improved Security**: The system now strictly enforces a **6-digit PIN** for all staff and managers, ensuring higher security than the previous 4-digit standard.
- **AuthImageRotation component**:
    - Cycles through 10 fashion images stored in `public/assets/auth/`.
    - **Rotation Interval**: 10 minutes.
    - **Transitions**: Smooth fade and scale effects via `Framer Motion`.
    - **Branding Overlay**: Large editorial text overlay: *"Redefining Fashion Tech."*

---

## 3. Sidebar & Core Navigation
The sidebar was re-engineered for better workflow flexibility.

- **Collapsible State**: Sidebar now collapses to a compact 60px track.
- **Toggle System**: Minimalist border-integrated tab with `ChevronsLeft/Right` icons.
- **Tooltips**: High-contrast, monochromatic tooltips appear on hover in the collapsed state.
- **Performance**: Forced `overflow-hidden` on the layout root to eliminate horizontal scrolling issues across all devices.

---

## 4. Standardized Layouts
All modules (Inventory, Products, Sales, Purchasing) have been standardized for alignment and scale.

- **Padding Standard**: Most pages now follow a `px-8 py-8` padding rule.
- **Grid Consistency**: Removed previous `max-w-4xl` and `max-w-5xl` constraints to allow the UI to expand naturally when the sidebar is toggled.
- **Edge-to-Edge**: Elements are now perfectly aligned with the sidebar track, eliminating "ghost gutters" on the left and right.

---

## 5. Settings Module Rebuild
The Settings pages were completely refactored to use the V3 Design System:
- **Business Profile**: Redesigned logo upload and profile cards.
- **Tax Management**: Clean, tabular layout for store-specific tax rates.
- **Store Settings**: Revamped store management cards and progress indicators.
- **Account & Billing**: Premium plan tiers and a stylized "Danger Zone."

---

## Technical Appendix
- **Primary CSS**: `app/globals.css` (Sync with V3 tokens).
- **Icons**: Lucide React.
- **Animations**: Framer Motion.
- **Images**: `public/assets/auth/` (fashion-1.webp to fashion-10.webp).
