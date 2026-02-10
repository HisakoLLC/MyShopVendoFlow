# VendoFlow Inventory & Sales Flow

## 1. Sales Flow

1. **Frontend creates a sale** via `create_sale_atomic` RPC:
   - Sends `store_id`, `cashier_id`, `customer_id`, `subtotal`, `tax_total`, `grand_total`, `payment_method`, `notes`, and `line_items` (JSON).
2. **Sale recorded in `sales` table**:
   - `sale_id`, `store_id`, `cashier_id`, `grand_total`, `status`, etc.
3. **Line items recorded in `sale_line_items` table**:
   - Each item links `sale_id` → `variant_id` and includes `quantity`, `unit_price`, `line_total`.
4. **Inventory decrement**:
   - Trigger `decrement_inventory_after_sale` runs **AFTER INSERT** on `sale_line_items`.
   - Reduces `quantity_on_hand` in `inventory_levels` for that `variant_id` and `store_id`.
   - Prevents overselling (raises exception if stock < 0).

## 2. Refund Flow

1. **Frontend creates a refund**:
   - Fetches sale and validates:
     - Sale exists, belongs to account/store
     - Not already refunded
     - Grand total > 0
2. **Refund recorded in `refunds` table**:
   - `refund_id`, `sale_id`, `refund_amount`, `refund_method`, `refunded_line_items` (JSON).
3. **Inventory increment**:
   - Trigger `increment_inventory_after_refund` runs **AFTER INSERT** on `refunds`.
   - Loops through `refunded_line_items` and adds back to `quantity_on_hand` in `inventory_levels` for the same `variant_id` and `store_id`.

## 3. Inventory Table

| Column               | Type | Description |
|----------------------|------|------------|
| `inventory_id`       | uuid | Primary key |
| `variant_id`         | uuid | Links to product variant |
| `store_id`           | uuid | Links to store |
| `quantity_on_hand`   | int  | Current stock available |
| `quantity_reserved`  | int  | Reserved stock (e.g., for pending orders) |
| `last_counted_date`  | ts   | Last stock count timestamp |

## 4. Key Notes

- **Triggers ensure data integrity**: front-end cannot directly manipulate inventory to avoid inconsistencies.
- **Inventory adjustments** happen **only at DB level**:
  - `sale_line_items` → decrement
  - `refunds` → increment
- **Frontend** merely calls RPCs or inserts/updates to `sales`/`refunds`; it does not calculate inventory.
- **Partial refunds** are supported; triggers sum quantities in `refunded_line_items`.

## 5. Recommendations

- Keep periodic audits to validate `inventory_levels` vs. `sales` and `refunds`.
- Backup DB before major changes.
- Document new triggers or inventory-related flows clearly for future developers.
