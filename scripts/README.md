# Demo Data Seeder

## Overview

The demo data seeder (`seed-demo-data.ts`) populates new accounts with realistic sample data to help users see the app in action immediately after signup.

## Usage

### From Onboarding (Automatic)

After a user completes onboarding and creates their first store, you can automatically seed demo data:

```typescript
import { seedDemoData } from "@/scripts/seed-demo-data"

// After creating first store in onboarding
const result = await seedDemoData(accountId, storeId)
```

### From Settings (Manual)

Add a "Load Demo Data" button in settings for existing accounts:

```typescript
import { loadDemoData } from "@/app/onboarding/actions"

// In a server action or API route
await loadDemoData(accountId, storeId)
```

## What Gets Seeded

1. **5 Categories**: Dresses, Tops, Bottoms, Accessories, Outerwear
2. **2 Seasons**: Spring/Summer 2025, Fall/Winter 2025
3. **2 Suppliers**: Bella Fabrics Co., Urban Styles Inc.
4. **10 Product Styles**: Various fashion items with realistic prices
5. **150 Variants**: 10 styles × 5 sizes × 3 colors each
6. **Inventory Levels**: Randomized stock (0-20 units per variant)
7. **8 Customers**: Mix of VIP and regular customers
8. **30 Sales**: Transactions over the last 90 days
9. **Variant Metrics**: Calculated based on sales and inventory

## Data Characteristics

- **Sales Distribution**: More recent dates = more sales (simulates business growth)
- **Payment Methods**: 60% M-Pesa, 30% Cash, 10% Card
- **Stock Levels**: 
  - 20% out of stock (0 units)
  - 30% low stock (1-5 units)
  - 50% healthy stock (6-20 units)
- **Customer Mix**: 30% VIP customers
- **Sales Linking**: 70% of sales linked to customers

## Database Requirements

The seeder requires the following tables:
- `categories`
- `seasons`
- `suppliers`
- `product_styles`
- `product_variants`
- `inventory_levels`
- `customers`
- `sales`
- `sale_line_items`
- `variant_metrics`
- `accounts` (with `has_demo_data` column)

## Adding has_demo_data Column

If the `has_demo_data` column doesn't exist in the `accounts` table, add it:

```sql
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS has_demo_data BOOLEAN DEFAULT FALSE;
```

## Notes

- The seeder uses realistic but fake data (no real customer information)
- Sales dates are distributed over the last 90 days with bias towards recent dates
- Variant metrics are calculated based on actual sales data
- Inventory is decremented based on sales to maintain consistency
