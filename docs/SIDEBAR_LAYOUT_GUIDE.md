# Sidebar Navigation & Layout Guide

The VendoFlow V3 sidebar is a high-performance navigation system designed for both focus and flexibility.

## 1. Interaction States
- **Expanded (Width: 260px)**: Default view for secondary navigation and group labels.
- **Collapsed (Width: 60px)**: Minimalist state for maximum horizontal workspace.
- **Toggle Mechanism**: 
    - Managed via `framer-motion` for smooth layout shifts.
    - Controlled by the `ChevronsLeft/Right` icon tab on the sidebar's right border.

## 2. Layout Standards (The "px-8" Rule)
To maintain perfect alignment with the sidebar and header, all dashboard modules must follow these layout rules:

- **Padding**: Standard padding of `px-8 py-8` (or `py-6/py-10` where appropriate for headers).
- **No Centering**: Avoid `mx-auto` or `max-w-*` on high-level page containers. This ensures the app feels "full-width" and correctly occupies the space next to the collapsed sidebar.
- **Root Container**: Every main page route should start with a `div` containing `min-h-screen` and standard padding, rather than nesting within multiple narrow cards.

## 3. Sidebar Technical Specs
- **Background**: `bg-zinc-950`
- **Borders**: Sharp `zinc-800` right border.
- **Active State**: A subtle `zinc-600` left border on the active module item.
- **Tooltips**: High-contrast tooltip displayed on the right edge of the 60px track when collapsed.
- **Scroll Hardening**: The `AppShell` root uses `overflow: hidden` to prevent horizontal browser scrollbars during transition animations.

---

## Developer Integration
When adding a new page, use the following snippet for the main container:

```tsx
<div className="min-h-screen px-8 py-8 bg-black text-white">
  {/* Content goes here */}
</div>
```
