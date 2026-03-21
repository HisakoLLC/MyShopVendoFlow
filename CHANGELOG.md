# Changelog

All notable changes to the VendoFlow project will be documented in this file.

## [3.0.0] - 2026-03-22
### Added
- **V3 Design System**: Full migration to a monochrome, editorial-inspired "Vogue" aesthetic.
- **Editorial Typography**: Integrated `Playfair Display` for high-impact headings and KPIs.
- **Enhanced PO PDF**: Completely redesigned server-side PDF generation with business branding, payment terms, and optimized layouts.
- **Back Button Navigation**: Added breadcrumb-style navigation across all Purchasing sub-pages.
- **V3 Migration Docs**: New detailed documentation in `docs/V3_MIGRATION.md`.

### Changed
- **PO Creation Workflow**: Extracted line items to full-width tables for better usability on desktop.
- **Data Entry Enhancement**: Standardized SKU and Unit Cost auto-population for Purchase Orders.
- **POS Light Theme**: Optimized contrast and visibility for the Point of Sale interface.
- **Global Components**: Standardized all buttons, badges, and tabs to `rounded-sm` geometry.

### Fixed
- **PO Calculation Stale State**: Resolved React Hook Form rendering bugs that caused totals to lag behind variant selection.
- **PO PDF Layout Overlaps**: Completely rewritten the PDF generator using a dynamic Y-cursor approach to fix layout issues.
- **PDF Download Failures**: Fixed 404 and credential errors on PO PDF downloads.
- **POS Modal Sizing**: Fixed variant selector overflows on smaller screens.
- **Checkout Flapping**: Resolved race conditions in the POS cart inventory validation.

---
*For a detailed phase-by-phase breakdown, see [docs/V3_MIGRATION.md](docs/V3_MIGRATION.md).*
