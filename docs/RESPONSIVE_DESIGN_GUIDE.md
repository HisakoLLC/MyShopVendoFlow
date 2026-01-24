# Responsive Design Guide

## Overview

VendoFlow is fully responsive across all device sizes, optimized for:
- **Desktop (1920×1080)**: Full-featured back-office experience
- **Tablet Landscape (1024×768)**: Primary POS device (iPad)
- **Tablet Portrait (768×1024)**: Management tasks
- **Mobile (375×667)**: On-the-go management

## Breakpoints

Using Tailwind's default breakpoints:
- `sm`: 640px (mobile landscape)
- `md`: 768px (tablet portrait)
- `lg`: 1024px (tablet landscape, small desktop)
- `xl`: 1280px (desktop)

## Component Responsive Patterns

### 1. POS Page (`app/pos/page.tsx`)

**Desktop/Tablet Landscape (lg+):**
- Split screen: 60% products, 40% cart
- Side-by-side layout

**Tablet Portrait (md):**
- Tabs: "Products" tab, "Cart" tab
- Full-height tabs for easy switching

**Mobile (< md):**
- Single column: Products view
- Cart as bottom sheet (slides up from bottom)
- Cart button with badge in header

### 2. Products Page (`app/products/page.tsx`)

**Desktop (lg+):**
- Full table with all columns (Image, Name, Category, Season, Price, Cost, Margin, Actions)

**Tablet (md):**
- Table view with hidden columns (Cost, Margin % hidden)
- Horizontal scroll if needed

**Mobile (< md):**
- Card view (not table)
- Each product as a card with:
  - Image thumbnail
  - Name, Category, Season
  - Price and margin badge
  - Edit button

### 3. Dashboard (`app/dashboard/page.tsx`)

**Desktop (lg+):**
- 4-column grid for stat cards
- Side-by-side charts

**Tablet (md):**
- 2-column grid for stat cards
- Stacked charts

**Mobile (< md):**
- 1-column stack for all cards
- Full-width charts (ResponsiveContainer)

### 4. Forms

**Pattern:**
```tsx
<div className="grid gap-4 md:grid-cols-2">
  <FormField name="field1" />
  <FormField name="field2" />
</div>
```

**Desktop:**
- 2-column layout for related fields
- Full-width for single fields

**Mobile:**
- 1-column stack
- Full-width inputs
- Minimum 44px height for touch targets

### 5. Modals/Dialogs

**Desktop:**
- Centered modal
- Max 600px width
- Rounded corners

**Mobile:**
- Full-screen
- No rounded corners
- Edge-to-edge

**Implementation:**
- Uses conditional classes: `w-screen h-screen md:w-full md:h-auto md:max-w-lg`

### 6. Tables

**Desktop:**
- Full table with all columns
- Hover states

**Tablet:**
- Hide less important columns
- Horizontal scroll if needed

**Mobile:**
- Card view (preferred)
- Or horizontal scroll with min-width

### 7. Navigation (Future)

**Desktop:**
- Sidebar (left, 240px wide)
- Always visible

**Mobile:**
- Hamburger menu
- Slide-in drawer from left
- Overlay backdrop

## Touch Targets

All interactive elements meet accessibility standards:
- **Minimum height**: 44px (mobile)
- **Minimum width**: 44px (buttons, icons)
- **Spacing**: 8px minimum between touch targets

## Responsive Utilities

### Common Patterns

```tsx
// Hide on mobile, show on desktop
<div className="hidden md:block">Desktop only</div>

// Show on mobile, hide on desktop
<div className="md:hidden">Mobile only</div>

// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* Cards */}
</div>

// Responsive text sizes
<h1 className="text-xl sm:text-2xl lg:text-3xl">Title</h1>

// Responsive padding
<div className="p-4 md:p-6 lg:p-8">Content</div>

// Responsive spacing
<div className="space-y-2 md:space-y-4">Items</div>
```

## Testing

Test on these devices:
1. **iPad (1024×768)** - Primary POS device
2. **iPhone (375×667)** - Mobile management
3. **Desktop (1920×1080)** - Back-office

Use Chrome DevTools device emulator for quick testing.

## Best Practices

1. **Mobile-first**: Design for mobile, enhance for desktop
2. **Progressive enhancement**: Add features for larger screens
3. **Touch-friendly**: 44px minimum touch targets
4. **Readable text**: Minimum 16px font size on mobile
5. **No horizontal scroll**: Except for tables (with clear indication)
6. **Fast loading**: Optimize images and code splitting
7. **Test real devices**: Emulators are good, real devices are better
