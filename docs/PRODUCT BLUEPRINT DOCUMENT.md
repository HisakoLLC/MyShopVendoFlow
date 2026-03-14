VendoFlow Product Blueprint
Implementation-Ready Specification for Engineering

1. Product Definition
VendoFlow is a cloud-based point-of-sale and inventory intelligence system built exclusively for independent fashion boutiques selling apparel and accessories with size and color variations. It replaces generic POS systems with a fashion-specific platform that surfaces inventory blind spots (dead stock by size/color, restock urgency by variant), processes in-store and online sales through a unified interface, and delivers actionable merchandising insights without requiring retail operations expertise. The system assumes a small catalog (500-5000 SKUs), high variant density (5-30 variants per style), and owners who need answers, not dashboards.
VendoFlow is NOT:

An accounting system (no GL, no payroll, no tax filing)
An ERP (no manufacturing, no supply chain orchestration)
A marketplace (no Shopify/Amazon integration in MVP)
A customizable platform (no webhooks, no API in MVP, no white-label)
An enterprise solution (hard cap at 10 stores on Scale plan)

Target Customer Persona:
Independent fashion boutique owner, 1-3 physical locations, $300K-$2M annual revenue, sells women's or men's apparel/accessories with standard sizing (XS-XXL or numeric). Currently uses Square/Shopify POS or a clunky legacy system. Frustrated by: not knowing which sizes are dead, reordering bestsellers that are actually overstocked in unpopular colors, discovering stockouts only when customers ask, and spending hours in spreadsheets trying to answer "what should I reorder?"
Core Problem Statement:
Fashion retailers are blind at the variant level. They know a "floral maxi dress" sells well but don't know that size Small in Navy is dead stock while Medium in Coral sells out weekly. Generic POS systems treat variants as separate products, making it impossible to understand style-level performance or make smart restock decisions. This causes cash tied up in dead inventory, lost sales from stockouts, and guesswork-based purchasing.
Success Definition for MVP:

A boutique owner can process a sale (size/color specific) in under 30 seconds
After 30 days of sales, the system automatically identifies top 10 dead stock items (by variant) with 80%+ accuracy
Restock suggestions surface the correct size/color to reorder based on sell-through rate
Owner can answer "what's my best-selling style this month?" in 2 clicks
System supports 2 physical stores + basic online sales with unified inventory
Zero manual data entry for size/color tracking after initial product setup


2. Module Architecture Overview
POS (Point of Sale)
Purpose: Process in-store and online sales with variant-level precision in under 30 seconds per transaction.
Why it exists: Sales data is the foundation of inventory intelligence; must capture size/color at transaction time.
Products & Variants
Purpose: Manage products as styles (e.g. "Floral Maxi Dress") with variants (size + color combinations) as the atomic unit of inventory.
Why it exists: Fashion retail is variant-dense; treating each size/color as a separate product creates catalog chaos.
Inventory Intelligence
Purpose: Surface dead stock, sell-through rates, and stock health by variant without manual analysis.
Why it exists: Core differentiation; answers "what's not selling?" and "what needs restocking?" automatically.
Purchasing & Restock
Purpose: Generate restock suggestions by variant and create purchase orders to suppliers.
Why it exists: Bridges insight to action; prevents over-ordering slow variants and under-ordering fast movers.
Sales & Analytics
Purpose: Show style-level and variant-level sales performance, basket size, payment methods, and trends.
Why it exists: Owners need to understand what's working without becoming data analysts.
Customers
Purpose: Capture customer contact info, purchase history, and enable basic loyalty tracking.
Why it exists: Repeat customers drive boutique revenue; need lightweight CRM for marketing.
Multi-Store
Purpose: Manage inventory across multiple physical locations with transfer tracking.
Why it exists: Many boutiques expand to 2-3 locations; inventory must sync without double-entry.
Staff & Roles
Purpose: Control who can process sales, issue refunds, view reports, and edit inventory.
Why it exists: Owners need cashiers who can't delete products or see profit margins.
Settings & Compliance
Purpose: Configure tax rates, receipt templates, payment gateways, and basic compliance (sales tax collection).
Why it exists: Legal requirement; must handle multi-jurisdiction tax without an accountant.
Platform/System
Purpose: Authentication, data sync, offline mode (limited), audit logs, backups.
Why it exists: Core infrastructure; system must work during internet outages and protect business data.

3. Module-by-Module Deep Specification
MODULE: POS (Point of Sale)
a) Scope

Processes in-store cash/card sales and online orders through a unified cart interface
Captures variant (size + color) for every line item
Handles discounts (percentage or fixed), taxes (multi-rate), tips, and split payments
Prints or emails receipts
Decrements inventory in real-time on sale completion
Supports returns/refunds with inventory reversal
Does NOT: integrate with external e-commerce (Shopify, WooCommerce), handle layaway, process gift cards (MVP), manage complex promotions (buy-2-get-1)

b) Features (MVP Only)

Quick-add products to cart via search (by style name, SKU, or barcode scan)
Variant selector shown immediately after style selection (grid of size × color with stock count)
Visual stock indicator per variant (in-stock / low-stock / out-of-stock)
Apply percentage or fixed-amount discount to line item or entire cart
Calculate tax automatically based on store location (single-rate MVP, multi-rate on Scale)
Accept cash, card (via Stripe Terminal integration), or "pay later" (online orders)
Email or print receipt (thermal printer support)
Process full or partial refunds within 90 days, with inventory return
"Park sale" feature to hold cart and resume later (single device only)
Offline mode: queue sales locally, sync when connection restored (max 50 transactions)

c) User Flows
Flow 1: Cashier completes an in-store sale

Cashier opens POS screen, cart is empty
Cashier searches for product "Linen Blazer" via search bar
System shows "Linen Blazer" style card with thumbnail
Cashier taps style, variant selector appears (grid: S/M/L × Beige/Navy)
Cashier selects "M, Navy" (shows "3 in stock")
Line item added to cart: "Linen Blazer - M, Navy - $89"
Customer wants second item; cashier repeats steps 2-6
Cashier taps "Checkout"
System calculates subtotal ($178), tax ($14.24 at 8%), total ($192.24)
Cashier selects payment method "Card"
Customer taps card on terminal, payment approved
System decrements inventory (M/Navy -1 for each item), saves sale
Receipt prints automatically; sale complete

Flow 2: Processing a return

Customer brings item + receipt within 90 days
Cashier opens "Returns" screen, enters receipt number or scans barcode
System shows original sale with line items
Cashier selects line item to return (e.g. "Linen Blazer - M, Navy")
System asks: "Refund to original payment method?" (Yes/No)
Cashier confirms, system processes refund via Stripe
Inventory increments (M/Navy +1), return recorded
Return receipt prints

Flow 3: Offline sale (internet down)

Internet drops; POS shows "Offline Mode" banner
Cashier processes sale normally (steps 1-11 from Flow 1)
System queues transaction locally (shows "Queued: 1 sale")
Internet restored; system auto-syncs queued sales in background
Banner changes to "Synced" then disappears

d) Data Entities (Logical)
Sale

sale_id (UUID, primary key)
store_id (foreign key to Store)
cashier_id (foreign key to Staff)
customer_id (nullable, foreign key to Customer)
sale_date (timestamp)
subtotal, tax_total, discount_total, tip_total, grand_total (decimals)
payment_method (enum: cash, card, pay_later)
status (enum: completed, refunded, partially_refunded)
receipt_number (unique, human-readable)
notes (text, optional)

SaleLineItem

line_item_id (UUID, primary key)
sale_id (foreign key to Sale)
variant_id (foreign key to ProductVariant)
quantity (integer, typically 1 for fashion)
unit_price (decimal, price at time of sale)
discount_amount (decimal)
tax_amount (decimal)
line_total (decimal)

Refund

refund_id (UUID, primary key)
sale_id (foreign key to Sale)
refund_date (timestamp)
refunded_line_items (JSON array of line_item_ids + quantities)
refund_amount (decimal)
refund_method (enum: original_payment, cash, store_credit)
processed_by (foreign key to Staff)

Relationships:

Sale → SaleLineItem (1-to-many)
Sale → Customer (many-to-1, optional)
SaleLineItem → ProductVariant (many-to-1)
Sale → Refund (1-to-many)

e) Edge Cases & Constraints

Offline limit: Max 50 queued sales; after that, system blocks new sales until sync
Refund window: 90 days hardcoded; configurable in Settings later
Partial refunds: Supported (e.g. return 1 of 2 items); inventory adjusts per line item
Stock validation: If variant goes to 0 during cart build, show "Out of stock" but allow sale (negative inventory warning in inventory module)
Split payments: NOT supported in MVP (defer to Phase 2)
Barcode scanning: Requires USB barcode scanner; scans map to variant_sku field
Receipt reprints: Allowed within same session; older receipts require manager override


MODULE: Products & Variants
a) Scope

Organizes inventory as Styles (parent products) containing Variants (size + color combinations)
Each variant has its own SKU, barcode, price (inherits from style by default), and stock count
Supports product categories (e.g. Tops, Dresses, Accessories) and seasons (Spring/Summer 2025)
Handles product images (1 per style, plus optional per-color images)
Does NOT: manage product bundles, kits, or configurable products; support custom attributes beyond size/color

b) Features (MVP Only)

Create/edit/archive styles with: name, description, category, season, base price, cost (for margin calc)
Define size grid per style (e.g. XS/S/M/L/XL or 6/8/10/12) using preset templates or custom
Define colors per style (select from predefined color list or add custom)
Auto-generate variants from size × color matrix (e.g. 5 sizes × 3 colors = 15 variants)
Assign unique SKU per variant (auto-generated or manual override)
Barcode generation per variant (Code 128 format, printable labels)
Bulk price adjustment (e.g. mark all variants down 20%)
Mark style as "Seasonal" with start/end dates (triggers dead stock alerts faster)
Image upload: 1 primary image per style, optional color-specific images
Archive (soft delete) styles; archived styles hidden from POS but retained in sales history

c) User Flows
Flow 1: Owner creates a new product style

Owner opens "Products" screen, clicks "Add Style"
Form appears: Name, Category (dropdown), Season (dropdown), Description (optional)
Owner enters: "Oversized Linen Shirt", Category="Tops", Season="SS 2025"
Owner sets base price ($75) and cost ($30)
Owner clicks "Next: Variants"
System asks: "Select size grid" (dropdown: Women's Standard, Men's Standard, Numeric, Custom)
Owner selects "Women's Standard" → sizes XS, S, M, L, XL pre-populate
Owner clicks "Add Colors", selects: White, Black, Olive
System shows matrix preview: 5 sizes × 3 colors = 15 variants
System auto-generates SKUs (e.g. OLS-XS-WHT, OLS-S-WHT, etc.) — owner can edit
Owner clicks "Create Variants"
System creates 15 variant records, all with $75 price, $30 cost, 0 stock
Owner taken to variant list, can now set initial stock counts

Flow 2: Owner adjusts variant pricing individually

Owner views "Oversized Linen Shirt" variant list
Owner notices size XL in all colors moves slowly
Owner selects all 3 XL variants (White, Black, Olive)
Owner clicks "Bulk Edit Price", enters $60 (20% off)
System updates 3 variants, maintains $30 cost, shows new margin (40% → 50%)
Price change effective immediately in POS

d) Data Entities (Logical)
ProductStyle

style_id (UUID, primary key)
name (string, e.g. "Oversized Linen Shirt")
category_id (foreign key to Category)
season_id (nullable, foreign key to Season)
description (text)
base_price (decimal, inherited by variants unless overridden)
cost (decimal, used for margin calculation)
image_url (string, primary image)
created_date, updated_date (timestamps)
archived (boolean)

ProductVariant

variant_id (UUID, primary key)
style_id (foreign key to ProductStyle)
size (string, e.g. "M")
color (string, e.g. "Olive")
sku (string, unique)
barcode (string, unique, nullable)
price (decimal, overrides base_price if set)
cost (decimal, overrides style cost if set)
color_image_url (nullable, color-specific image)
created_date (timestamp)

InventoryLevel (separate table for multi-store stock tracking)

inventory_id (UUID, primary key)
variant_id (foreign key to ProductVariant)
store_id (foreign key to Store)
quantity_on_hand (integer, can be negative if oversold)
quantity_reserved (integer, for online orders not yet fulfilled)
last_counted_date (timestamp, for physical inventory audits)

Category

category_id (UUID)
name (string, e.g. "Dresses", "Tops", "Accessories")
parent_category_id (nullable, for subcategories — defer to Phase 2)

Season

season_id (UUID)
name (string, e.g. "Spring/Summer 2025")
start_date, end_date (dates, used for dead stock detection)

Relationships:

ProductStyle → ProductVariant (1-to-many)
ProductVariant → InventoryLevel (1-to-many, one per store)
ProductStyle → Category (many-to-1)
ProductStyle → Season (many-to-1, optional)

e) Edge Cases & Constraints

Variant limit: Max 50 variants per style (prevents catalog bloat; fashion items rarely exceed this)
SKU conflicts: System checks for duplicate SKUs on save; blocks creation if collision detected
Price inheritance: Variants inherit base_price from style unless explicitly overridden
Archived styles: Cannot be un-archived in MVP (prevent clutter); owner must create new style
Image limits: 1 primary image per style, 1 per color (max 20 images per style)
Negative inventory: Allowed (overselling tracked); triggers alert in Inventory Intelligence


MODULE: Inventory Intelligence
a) Scope

Automatically calculates and surfaces: dead stock (by variant), sell-through rate, days of inventory remaining, stock health score
Flags overstock and stockout risks before they become critical
Uses sales velocity (units sold per day) and stock on hand to generate insights
Does NOT: use machine learning, predict demand with external data (weather, trends), auto-order inventory

b) Features (MVP Only)

Dead Stock Report: Variants with <10% sell-through rate in last 90 days, ranked by inventory value ($)
Sell-Through Rate: (Units Sold ÷ (Starting Inventory + Units Received)) × 100, calculated per variant over 30/60/90 day windows
Stock Health Dashboard: Traffic light system per variant (Green: healthy, Yellow: low stock, Red: dead stock or out of stock)
Days of Inventory Remaining: (Current Stock ÷ Average Daily Sales) = days until stockout, shown per variant
Restock Urgency Score: Combines sell-through rate + days remaining to rank variants needing reorder
Low Stock Alerts: Email/in-app notification when variant drops below "reorder point" (configurable per style, default = 7 days of inventory)
Overstock Alerts: Variants with >90 days of inventory + <15% sell-through rate flagged
Size/Color Heatmap: Visual grid showing which size/color combos are dead vs. flying per style

c) User Flows
Flow 1: Owner reviews dead stock weekly

Owner opens "Inventory Intelligence" screen on Monday morning
Default view: "Dead Stock Report" tab, sorted by inventory value (highest first)
System shows table:

Style: "Silk Midi Skirt"
Variant: L, Burgundy
Stock: 8 units
Sell-Through (90d): 5%
Inventory Value: $240 (8 × $30 cost)
Suggested Action: "Mark down 30% or transfer to Store 2"


Owner clicks variant, sees detail: 0 sales in 90 days, received 8 units in March
Owner decides to mark down; clicks "Apply Discount" → creates 30% off price override in Products module
Variant removed from dead stock list on next refresh

Flow 2: System alerts owner of low stock

Variant "Crop Top - S, Black" sells 2 units today
Stock drops to 4 units; system calculates avg daily sales = 1.2 units
Days remaining = 4 ÷ 1.2 = 3.3 days (below 7-day reorder point)
System triggers low stock alert: email sent to owner + in-app notification badge
Alert reads: "Crop Top (S, Black) has 3 days of stock left. Reorder 10 units to maintain 14-day buffer."
Owner clicks alert, taken to Purchasing module with pre-filled restock suggestion

Flow 3: Owner uses size/color heatmap to understand performance

Owner opens "Floral Maxi Dress" style detail page
Clicks "Size/Color Heatmap" tab
System shows grid:

Rows: XS, S, M, L, XL
Columns: Navy, Coral, Sage
Cells color-coded: Green (high sell-through), Yellow (medium), Red (dead)


Owner sees: S/Coral is green (75% sell-through), XL/Navy is red (2% sell-through)
Owner notes: stop ordering XL/Navy, double down on S/Coral for next buy

d) Data Entities (Logical)
InventorySnapshot (daily aggregation for performance)

snapshot_id (UUID, primary key)
variant_id (foreign key to ProductVariant)
store_id (foreign key to Store)
snapshot_date (date)
starting_inventory (integer, stock at start of day)
units_sold (integer)
units_received (integer, from purchase orders)
ending_inventory (integer)

VariantMetrics (calculated nightly, cached for speed)

variant_id (foreign key to ProductVariant)
sell_through_30d, sell_through_60d, sell_through_90d (decimals, percentages)
avg_daily_sales_30d (decimal)
days_of_inventory (integer, current stock ÷ avg daily sales)
restock_urgency_score (integer, 0-100, higher = more urgent)
stock_health (enum: healthy, low, dead, out_of_stock)
last_calculated (timestamp)

ReorderPoint (configurable per style or variant)

reorder_point_id (UUID, primary key)
variant_id (foreign key to ProductVariant)
reorder_threshold_days (integer, default 7, triggers alert when days_of_inventory < this)
reorder_quantity (integer, suggested order quantity)

Relationships:

ProductVariant → InventorySnapshot (1-to-many)
ProductVariant → VariantMetrics (1-to-1, regenerated nightly)
ProductVariant → ReorderPoint (1-to-1, optional)

e) Edge Cases & Constraints

New products: Variants with <30 days of sales history show "Insufficient Data" for sell-through rate
Seasonal products: If style has season end date in past, dead stock threshold loosens to 30 days (instead of 90)
Zero sales, zero stock: Variant with 0 sales and 0 stock does not appear in dead stock report (not actionable)
Negative inventory: Treated as 0 for calculations; flagged separately in "Inventory Issues" tab
Manual inventory adjustments: Recalculate metrics within 1 hour of adjustment (not real-time)
Multi-store: Metrics calculated per-store, then aggregated for company-wide view


MODULE: Purchasing & Restock
a) Scope

Generates restock suggestions based on sell-through rate, days of inventory, and reorder points
Creates purchase orders (POs) to suppliers with variant-level detail
Tracks PO status (Draft, Sent, Partially Received, Received, Cancelled)
Receives inventory into specific stores, incrementing stock counts
Does NOT: integrate with supplier catalogs, auto-send POs via EDI, manage consignment inventory

b) Features (MVP Only)

Restock Suggestions: Auto-generated list of variants to reorder, sorted by urgency score
Suggested order quantity = (Avg Daily Sales × Target Days of Stock) - Current Stock
Owner can adjust quantities, add/remove variants before creating PO
Create Purchase Order: Select supplier (from list), add variants, set expected delivery date, add costs
PO shows: variant name, size, color, quantity, unit cost, line total, PO total
Send PO: Mark PO as "Sent" (email to supplier manually in MVP, no auto-send)
Receive Inventory: Scan or manually enter received quantities per variant, select destination store
Partial receives supported (e.g. receive 50 of 100 ordered units)
System increments InventoryLevel on receive
Supplier Management: Simple supplier list with name, email, phone, payment terms

c) User Flows
Flow 1: Owner creates PO from restock suggestions

Owner opens "Purchasing" screen, clicks "Restock Suggestions" tab
System shows table of 20 variants needing restock, sorted by urgency (highest first)

Example: "Linen Blazer - M, Navy" | Current Stock: 2 | Avg Daily Sales: 0.8 | Suggested Order: 10


Owner selects 5 variants to reorder (checkboxes)
Owner clicks "Create PO from Selected"
System asks: "Select Supplier" (dropdown)
Owner selects "Bella Fabrics Co."
System pre-fills PO with 5 line items, quantities from suggestions, unit costs from ProductVariant.cost
Owner adjusts quantity for one variant (10 → 15 units)
Owner sets "Expected Delivery Date" (date picker, defaults to +14 days)
Owner clicks "Save PO as Draft"
PO created, status = Draft, PO number auto-assigned (e.g. PO-2025-0042)

Flow 2: Owner receives inventory from PO

Shipment arrives from supplier
Owner opens PO-2025-0042 (status = Sent)
Clicks "Receive Inventory"
System shows line items with "Quantity Ordered" and "Quantity Received" columns
Owner enters received quantities (can scan barcodes to auto-populate)

Example: Ordered 15, Received 12 (3 backordered)


Owner selects destination store "Main Street Location"
Owner clicks "Confirm Receipt"
System increments InventoryLevel for received variants at Main Street (+12)
PO status updates to "Partially Received" (3 units still outstanding)
Owner can repeat receive process when backorder arrives

d) Data Entities (Logical)
Supplier

supplier_id (UUID, primary key)
name (string)
email, phone (strings)
payment_terms (string, e.g. "Net 30")
notes (text)

PurchaseOrder

po_id (UUID, primary key)
po_number (string, unique, auto-generated)
supplier_id (foreign key to Supplier)
order_date (date)
expected_delivery_date (date)
status (enum: draft, sent, partially_received, received, cancelled)
total_cost (decimal, sum of line items)
created_by (foreign key to Staff)

POLineItem

line_item_id (UUID, primary key)
po_id (foreign key to PurchaseOrder)
variant_id (foreign key to ProductVariant)
quantity_ordered (integer)
quantity_received (integer, starts at 0)
unit_cost (decimal)
line_total (decimal)

InventoryReceipt (audit trail for receives)

receipt_id (UUID, primary key)
po_id (foreign key to PurchaseOrder)
received_date (timestamp)
store_id (foreign key to Store)
received_by (foreign key to Staff)
line_items_received (JSON array of {variant_id, quantity})

Relationships:

PurchaseOrder → POLineItem (1-to-many)
PurchaseOrder → Supplier (many-to-1)
PurchaseOrder → InventoryReceipt (1-to-many)

e) Edge Cases & Constraints

Over-receiving: Cannot receive more than ordered quantity; system blocks with error message
Partial receives: Unlimited; PO stays "Partially Received" until qty_received = qty_ordered for all lines
Cancelled POs: Can cancel Draft or Sent POs; cannot cancel if any inventory received
Restock suggestions: Recalculated nightly; manual refresh button available
Supplier limit: Max 100 suppliers in MVP (prevents dropdown bloat)
PO editing: Can edit Draft POs; cannot edit Sent/Received POs (create new PO instead)


MODULE: Sales & Analytics
a) Scope

Displays sales performance at style-level, variant-level, store-level, and company-wide
Shows revenue, units sold, average basket size, payment method breakdown, top customers
Supports date range filtering (today, last 7/30/90 days, custom range)
Does NOT: forecast sales, compare to budget, integrate with accounting software

b) Features (MVP Only)

Sales Summary Dashboard: Revenue, units sold, transactions, avg basket size for selected date range
Top Sellers Report: Top 10 styles by revenue and by units sold
Variant Performance: Drill into any style to see sales by size/color
Payment Methods Breakdown: % of sales by cash, card, pay later
Sales by Store: Compare performance across locations
Hourly Sales Chart: Bar chart showing transaction count by hour (identify peak times)
Customer Insights: Repeat customer rate, avg spend per customer, top 10 customers by lifetime value
Export to CSV: All reports exportable for external analysis

c) User Flows
Flow 1: Owner reviews weekly sales

Owner opens "Analytics" screen on Monday
Default view: Sales Summary Dashboard, date range = "Last 7 Days"
Dashboard shows:

Total Revenue: $8,450
Units Sold: 112
Transactions: 78
Avg Basket: $108


Owner scrolls to "Top Sellers" widget
Sees "Linen Blazer" is #1 by revenue ($1,200), "Crop Top" is #1 by units (24)
Owner clicks "Linen Blazer" to drill down
Variant breakdown appears: M/Navy sold 8 units, L/Beige sold 5 units, etc.
Owner notes M/Navy is hot, adds to mental restock list

Flow 2: Owner compares store performance

Owner opens "Sales by Store" tab
Date range = "Last 30 Days"
Table shows:

Main Street: $24,000 revenue, 310 units
Riverside: $18,500 revenue, 245 units


Owner sees Main Street outperforming by 30%
Owner clicks "Riverside" to investigate
Drill-down shows Riverside has fewer transactions but higher avg basket ($75 vs $77)
Owner decides to run promo at Riverside to drive traffic

d) Data Entities (Logical)
Most data pulled from Sale, SaleLineItem, Customer tables. Aggregations cached in:
DailySalesMetrics (pre-aggregated for speed)

metric_id (UUID, primary key)
date (date)
store_id (foreign key to Store, nullable for company-wide)
total_revenue (decimal)
total_units_sold (integer)
transaction_count (integer)
avg_basket_size (decimal)
cash_revenue, card_revenue (decimals)

StyleSalesMetrics (pre-aggregated, recalculated nightly)

style_id (foreign key to ProductStyle)
period (enum: 7d, 30d, 90d)
units_sold (integer)
revenue (decimal)
rank_by_revenue, rank_by_units (integers)

Relationships:

DailySalesMetrics → Store (many-to-1, optional for company-wide)
StyleSalesMetrics → ProductStyle (many-to-1)

e) Edge Cases & Constraints

Refunds: Excluded from revenue/units sold in standard reports; separate "Refunds Report" available
Date range limits: Max 1 year custom range (prevents performance issues)
Real-time vs. cached: Dashboard updates every 15 minutes; "Refresh Now" button forces update
Multi-store aggregation: Company-wide view sums all stores; store-specific filter available
Zero sales days: Show as $0 in charts (don't hide)


MODULE: Customers
a) Scope

Captures customer contact info (name, email, phone) at POS or manually
Tracks purchase history per customer (total spend, transaction count, last purchase date)
Enables basic seg
ContinueJan 20mentation (VIPs, first-timers)

Does NOT: manage loyalty points, send marketing emails (integration only), handle customer accounts/logins

b) Features (MVP Only)

Quick Add at POS: During checkout, cashier can enter customer email or phone → system creates/links customer record
Customer List: Searchable, sortable table with name, email, total spend, transaction count
Customer Detail View: Shows all past purchases (with dates, items, totals), contact info, notes
VIP Tagging: Manually tag customers as VIP (for preferential treatment, not automated)
Export Customers: CSV export of customer list for email marketing (Mailchimp, etc.)
Duplicate Detection: When adding customer, system checks email/phone for existing record

c) User Flows
Flow 1: Cashier links customer to sale

Cashier completes cart (total $150)
Before payment, cashier asks "Do you have an email for your receipt?"
Customer provides email: sarah@example.com
Cashier types email in "Customer Email" field
System checks: existing customer found (Sarah Johnson)
System pre-fills name, confirms with cashier
Sale proceeds, linked to Sarah's account
Sarah's lifetime spend updates: $450 → $600

Flow 2: Owner reviews VIP customers

Owner opens "Customers" screen
Clicks filter "VIP Only"
System shows 12 customers tagged as VIP
Owner sees Sarah Johnson: $2,400 lifetime spend, 18 transactions
Owner clicks Sarah's record, sees last purchase was 5 days ago
Owner adds note: "Prefers size M, loves neutrals"
Note saved, visible to all staff during future sales

d) Data Entities (Logical)
Customer

customer_id (UUID, primary key)
first_name, last_name (strings)
email (string, unique, nullable)
phone (string, nullable)
is_vip (boolean)
total_spend (decimal, calculated from sales)
transaction_count (integer)
first_purchase_date, last_purchase_date (dates)
notes (text)
created_date (timestamp)

Relationships:

Customer → Sale (1-to-many via sale.customer_id)

e) Edge Cases & Constraints

Anonymous sales: Customer field optional; sale proceeds without customer linkage
Duplicate emails: System prevents duplicate emails; if customer enters existing email, merge prompt shown
Phone-only customers: Email not required; phone can be primary identifier
Data privacy: No built-in GDPR deletion in MVP; manual process via support


MODULE: Multi-Store
a) Scope

Manages inventory across multiple physical locations (max 10 stores on Scale plan)
Tracks inventory levels per store for each variant
Supports inventory transfers between stores (with audit trail)
Each store has its own POS instance, but data syncs to central cloud database
Does NOT: manage franchise relationships, handle inter-company transfers, support dark stores/warehouses (MVP treats all locations as retail stores)

b) Features (MVP Only)

Store Setup: Add/edit stores with name, address, tax rate, timezone
Per-Store Inventory View: See stock levels for any variant across all stores
Transfer Requests: Initiate transfer of X units of variant from Store A to Store B
Transfer status tracked (Pending, In Transit, Completed)
Transfer History: Audit log of all transfers with dates, quantities, who initiated
Store Selector in POS: Cashier POS session tied to specific store; inventory decrements from that store only
Company-Wide Inventory Totals: Aggregate view of stock across all locations

c) User Flows
Flow 1: Owner transfers stock between stores

Owner sees Main Street has 12 units of "Crop Top - S, Black", Riverside has 0
Riverside cashier reports customer requesting this variant
Owner opens "Inventory" → "Transfer Stock"
Selects: From = Main Street, To = Riverside, Variant = Crop Top S/Black, Quantity = 4
Owner clicks "Create Transfer"
System creates transfer record (status = Pending)
Owner prints transfer note, physically ships items to Riverside
Riverside manager opens transfer, clicks "Mark Received"
System decrements Main Street inventory (-4), increments Riverside (+4)
Transfer status = Completed

Flow 2: Owner views company-wide inventory

Owner opens "Products" → "Linen Blazer" → "Inventory by Store" tab
System shows table:

Variant: M, Navy
Main Street: 8 units
Riverside: 3 units
Total: 11 units


Owner sees distribution, decides to transfer 2 from Main to Riverside (repeat Flow 1)

d) Data Entities (Logical)
Store

store_id (UUID, primary key)
name (string, e.g. "Main Street Location")
address (string)
tax_rate (decimal)
timezone (string, e.g. "America/New_York")
active (boolean)

InventoryTransfer

transfer_id (UUID, primary key)
from_store_id (foreign key to Store)
to_store_id (foreign key to Store)
variant_id (foreign key to ProductVariant)
quantity (integer)
status (enum: pending, in_transit, completed, cancelled)
created_by (foreign key to Staff)
created_date, completed_date (timestamps)

Relationships:

Store → InventoryLevel (1-to-many)
Store → Sale (1-to-many via sale.store_id)
InventoryTransfer → Store (many-to-1 for both from/to)

e) Edge Cases & Constraints

Transfer limits: Max 100 units per transfer (prevents bulk errors)
Negative inventory: If transfer would create negative inventory at source store, system blocks with warning
In-transit inventory: Decremented from source immediately on transfer creation, incremented at destination on completion (no "in-transit" holding state in MVP)
Store limit: Starter = 1 store, Core = 3 stores, Scale = 10 stores (hard limits)
Store deletion: Cannot delete store with sales history; must deactivate instead


MODULE: Staff & Roles
a) Scope

Manages user accounts for cashiers, managers, and owners
Role-based permissions control access to POS, inventory, reports, settings
Tracks which staff member processed each sale (for accountability)
Does NOT: handle payroll, time tracking, commission calculation

b) Features (MVP Only)

User Roles (3 preset roles):

Cashier: Can process sales, returns; cannot edit inventory, view cost/margin, access reports
Manager: Cashier permissions + edit inventory, view reports, manage customers
Owner: Full access (all features)


Add Staff: Create account with email, name, role, optional PIN for POS login
POS Login: Staff logs in with email + password (web) or PIN (POS device)
Activity Log: Shows who processed each sale, who made inventory adjustments
Deactivate Staff: Remove access without deleting sales history

c) User Flows
Flow 1: Owner adds a new cashier

Owner opens "Settings" → "Staff"
Clicks "Add Staff Member"
Enters: Name (John Doe), Email (john@example.com), Role = Cashier
Generates 4-digit PIN (1234) for POS login
Sends invitation email with login link + PIN
John logs in, sets password, assigned to Main Street store
John can now process sales but cannot access inventory or reports

Flow 2: Manager edits inventory

Manager logs in, opens "Products"
Clicks "Linen Blazer" → "Edit Variants"
Adjusts stock for M/Navy from 8 → 10 (received shipment manually)
System logs: "Jane Smith (Manager) adjusted Linen Blazer M/Navy +2 units on 2025-01-20"
Adjustment visible in Activity Log

d) Data Entities (Logical)
Staff

staff_id (UUID, primary key)
email (string, unique)
first_name, last_name (strings)
role (enum: cashier, manager, owner)
pin (string, 4-digit, hashed)
assigned_store_id (foreign key to Store, nullable for multi-store access)
active (boolean)
created_date (timestamp)

ActivityLog

log_id (UUID, primary key)
staff_id (foreign key to Staff)
action_type (enum: sale, refund, inventory_adjustment, transfer, etc.)
entity_id (UUID, references affected entity, e.g. sale_id or variant_id)
timestamp (timestamp)
details (JSON, action-specific metadata)

Relationships:

Staff → Sale (1-to-many via sale.cashier_id)
Staff → ActivityLog (1-to-many)

e) Edge Cases & Constraints

Role changes: Changing role takes effect on next login (no instant permission update)
PIN conflicts: System prevents duplicate PINs across all staff
Owner account: Must have at least 1 active Owner; system blocks deactivation if only owner
Audit trail: Activity log retained indefinitely (no auto-deletion)


MODULE: Settings & Compliance
a) Scope

Configures tax rates, receipt templates, payment gateway (Stripe)
Handles sales tax calculation (single-rate MVP, multi-rate on Core/Scale)
Stores business info (name, address, logo) for receipts and invoices
Does NOT: file taxes, generate 1099s, integrate with accounting software (QuickBooks, Xero)

b) Features (MVP Only)

Business Profile: Name, address, phone, logo upload, tax ID (for receipts)
Tax Settings: Default tax rate per store (e.g. 8.5% for Main Street); applied automatically at POS
Multi-rate support (Core+): Multiple tax rates per store (e.g. city + county + state)
Receipt Templates: Customize header/footer text, logo placement, return policy text
Payment Gateway: Connect Stripe account (OAuth flow), configure card reader
Currency: USD only in MVP (defer multi-currency to Phase 2)
User Preferences: Date format, timezone

c) User Flows
Flow 1: Owner configures tax rate

Owner opens "Settings" → "Tax Settings"
Clicks "Main Street Location"
Enters tax rate: 8.75%
Saves; POS immediately applies 8.75% to all sales at Main Street

Flow 2: Owner customizes receipt

Owner opens "Settings" → "Receipts"
Uploads logo (PNG, max 200KB)
Edits footer text: "Returns within 30 days with receipt. No refunds on sale items."
Clicks "Preview", sees sample receipt
Saves; new template used for all future receipts

d) Data Entities (Logical)
BusinessSettings (singleton per account)

settings_id (UUID, primary key)
business_name, address, phone, tax_id (strings)
logo_url (string)
default_currency (string, "USD")
receipt_header, receipt_footer (text)

StoreTaxRate

tax_rate_id (UUID, primary key)
store_id (foreign key to Store)
tax_name (string, e.g. "State Sales Tax")
rate (decimal, e.g. 0.0875 for 8.75%)
active (boolean)

PaymentGateway

gateway_id (UUID, primary key)
provider (enum: stripe)
account_id (string, Stripe account ID)
status (enum: connected, disconnected)

Relationships:

Store → StoreTaxRate (1-to-many, for multi-rate support)

e) Edge Cases & Constraints

Tax rate changes: Apply to new sales only; past sales retain original rate
Logo size: Max 200KB, formats: PNG, JPG; auto-resized to fit receipt width
Stripe disconnection: If Stripe disconnected, POS blocks card payments (cash-only mode)
Multi-currency: Not supported; attempting to change currency shows error


MODULE: Platform/System
a) Scope

Handles authentication, session management, data sync, backups, audit logs
Offline mode for POS (limited)
Does NOT: provide public API, webhooks, or white-label capabilities in MVP

b) Features (MVP Only)

Authentication: Email + password login, session timeout after 60 minutes of inactivity
Data Sync: Real-time sync for sales/inventory; background sync for reports (every 15 min)
Offline Mode (POS only): Queue up to 50 sales locally, auto-sync when connection restored
Backups: Nightly automated backups, retained for 30 days
Audit Logs: Track all data changes (who, what, when) for sales, inventory, transfers
Error Handling: User-friendly error messages; critical errors auto-reported to support
Browser Support: Chrome, Safari, Edge (latest 2 versions); no IE support

c) User Flows
Flow 1: POS goes offline

Internet connection drops at 2pm during busy period
POS shows "Offline Mode" banner
Cashier continues processing sales (up to 50 transactions queued)
Internet restored at 2:45pm
System auto-syncs 18 queued sales in background
Banner updates: "Synced 18 sales" then disappears after 5 seconds

Flow 2: Owner reviews audit log

Owner suspects unauthorized inventory change
Opens "Settings" → "Audit Logs"
Filters by action_type = "inventory_adjustment", date = last 7 days
Sees entry: "Jane Smith adjusted Linen Blazer M/Navy +50 units on Jan 18, 3:42pm"
Owner contacts Jane to confirm (was legitimate shipment receive)

d) Data Entities (Logical)
Session

session_id (UUID, primary key)
staff_id (foreign key to Staff)
login_time, last_activity, logout_time (timestamps)
ip_address (string)

SyncQueue (for offline mode)

queue_id (UUID, primary key)
device_id (string, identifies POS terminal)
payload (JSON, serialized sale data)
queued_at, synced_at (timestamps)
status (enum: queued, synced, failed)

Backup

backup_id (UUID, primary key)
backup_date (date)
file_path (string, S3 or similar)
size_mb (decimal)

Relationships:

Session → Staff (many-to-1)
SyncQueue → no foreign keys (standalone)

e) Edge Cases & Constraints

Offline limit: Max 50 queued transactions; if exceeded, POS blocks new sales with "Sync Required" message
Session timeout: 60 minutes; extends on any activity; timeout shows modal "Session expired, please log in"
Sync conflicts: If two devices edit same inventory simultaneously, last-write-wins (no conflict resolution in MVP)
Backup restore: Manual process via support (no self-service restore in MVP)


4. Core Differentiation Logic (Inventory Intelligence)
This is the heart of VendoFlow's value proposition. The system must automatically answer three questions for boutique owners: (1) Which variants are dead stock? (2) Which variants need restocking? (3) How is each style performing at the size/color level?
Dead Stock Calculation
Definition: A variant is "dead stock" if it has poor sales velocity relative to its time in inventory and represents tied-up capital.
Logic:

Calculate sell-through rate per variant over the last 90 days:

Sell-Through Rate = (Units Sold in Period) ÷ (Starting Inventory + Units Received) × 100


Flag as dead stock if:

Sell-through rate < 10% (only 1 in 10 units sold) AND
Current stock > 3 units AND
Days in inventory > 60 days


For seasonal products (where style.season_id has end_date in the past):

Reduce threshold to 30 days in inventory (sell season faster)



Assumptions:

New variants (<30 days in inventory) excluded from dead stock calculation (need time to sell)
Styles marked as "Clearance" or "Final Sale" excluded (expected to move slowly)
Calculation runs nightly; results cached in VariantMetrics table

Example:

Variant: "Silk Midi Skirt - L, Burgundy"
Starting inventory (90 days ago): 10 units
Units received: 0
Units sold: 1
Sell-through rate: 1 ÷ 10 × 100 = 10% (borderline)
Current stock: 9 units
Days in inventory: 120 days
Result: Flagged as dead stock (10% threshold, >60 days)


Sell-Through Rate Calculation
Purpose: Measure what percentage of available inventory was sold over a time period.
Formula:
Sell-Through Rate = (Units Sold) ÷ (Starting Inventory + Units Received) × 100
Time Periods:

30-day, 60-day, 90-day windows (all calculated separately)

Interpretation:

>50%: Healthy; variant is moving well
25-50%: Medium; watch for trends
<25%: Slow; potential dead stock
<10%: Dead stock threshold

Edge Cases:

If (Starting Inventory + Units Received) = 0, sell-through rate = N/A (cannot divide by zero)
If Units Sold > (Starting + Received), cap at 100% (prevents >100% due to negative inventory quirks)


Days of Inventory Remaining
Purpose: Predict how many days until stockout based on current sales velocity.
Formula:
Days of Inventory = (Current Stock) ÷ (Average Daily Sales over last 30 days)
Calculation Details:

Average Daily Sales = (Total Units Sold in last 30 days) ÷ 30
If Average Daily Sales = 0, Days of Inventory = ∞ (displayed as "Not Selling")

Interpretation:

<7 days: Urgent restock (red alert)
7-14 days: Low stock (yellow alert)
15-30 days: Healthy buffer (green)
>90 days: Overstock (potential dead stock)

Example:

Current stock: 12 units
Units sold (last 30 days): 15 units
Avg daily sales: 15 ÷ 30 = 0.5 units/day
Days of inventory: 12 ÷ 0.5 = 24 days (healthy)


Restock Suggestions
Purpose: Tell owner exactly how many units to order for each variant.
Logic:

Calculate reorder point (days of inventory threshold, default = 7 days)
If Days of Inventory < reorder point, variant needs restocking
Calculate suggested order quantity:

   Suggested Qty = (Target Days of Stock × Avg Daily Sales) - Current Stock

Target Days of Stock = configurable per style (default 30 days)


Round up to nearest "case pack size" if supplier has minimums (defer to Phase 2; MVP uses raw calculation)

Urgency Score (0-100):
Used to rank which variants to reorder first.
Urgency Score = (100 - Days of Inventory) + (Sell-Through Rate × 0.5)

Caps at 100
Higher score = more urgent

Example:

Variant: "Crop Top - S, Black"
Current stock: 4 units
Avg daily sales: 1.2 units/day
Days of inventory: 4 ÷ 1.2 = 3.3 days (below 7-day threshold)
Target stock: 30 days
Suggested order qty: (30 × 1.2) - 4 = 36 - 4 = 32 units
Urgency score: (100 - 3) + (75 × 0.5) = 97 + 37.5 = 100 (capped)


Size/Color Heatmap
Visual Representation:

Grid: Rows = sizes, Columns = colors
Cell color: Green (sell-through >50%), Yellow (25-50%), Red (<25%)
Cell shows: Stock count + sell-through rate

Purpose: Let owner visually identify which size/color combos are winners vs. losers.
Example Output (text representation):
Floral Maxi Dress - Last 90 Days

        Navy         Coral        Sage
XS    [Red: 2, 8%] [Yel: 4, 40%] [Grn: 1, 60%]
S     [Yel: 5, 35%] [Grn: 2, 75%] [Yel: 6, 30%]
M     [Grn: 3, 55%] [Grn: 1, 80%] [Yel: 4, 45%]
L     [Red: 8, 5%] [Yel: 5, 28%] [Red: 7, 12%]
XL    [Red: 10, 2%] [Red: 9, 5%] [Red: 8, 3%]
Insight: Stop ordering XL in all colors; S/Coral is the hero variant.

Assumptions the System Makes

Sales velocity is predictive: Past 30-day sales indicate future demand (no seasonality adjustments in MVP)
Linear demand: System assumes consistent daily sales (no weekend/weekday weighting)
No external data: Does not factor weather, trends, social media, competitor actions
Owner sets target stock levels: System suggests based on owner's target days (default 30)
No minimum order quantities: Restock suggestions ignore supplier MOQs (owner adjusts manually)
All variants treated equally: No weighting for margin, brand, or strategic importance


5. Pricing Tier Mapping (Feature Gating)
VendoFlow offers three plans. The primary plan is Core ($180/month). Starter and Scale exist to anchor pricing and support edge cases.
Starter Plan - $116/month
Target: Solo boutique, 1 location, just starting out or very small operation.
Included Modules:

POS (single store only)
Products & Variants (max 500 styles, 5,000 variants)
Inventory Intelligence (basic: dead stock report only, no heatmaps)
Customers (max 1,000 customer records)
Sales & Analytics (last 30 days only)
Staff & Roles (max 2 users: 1 owner + 1 cashier)
Settings & Compliance (single tax rate only)

Disabled Features:

Multi-Store (locked at 1 store)
Purchasing & Restock (no PO creation; restock suggestions visible but read-only)
Advanced analytics (no variant heatmaps, no hourly sales chart)
Export to CSV (disabled)
Historical data beyond 30 days

Limits:

500 styles max
5,000 variants max
1,000 customers max
2 staff accounts
30 days of sales history


Core Plan - $180/month (PRIMARY)
Target: Established boutique, 1-3 locations, professional operation.
Included Modules:

All modules (POS, Products, Inventory Intelligence, Purchasing, Sales, Customers, Multi-Store, Staff, Settings, Platform)
Full Inventory Intelligence (dead stock, sell-through, heatmaps, alerts)
Multi-Store (up to 3 stores)
Unlimited styles/variants (within reason; soft cap at 10,000 variants)
Unlimited customers
12 months of sales history
Export to CSV (all reports)
Multi-rate tax (city + county + state)

Staff:

Max 10 staff accounts (mix of cashiers/managers/owners)

Purchasing:

Unlimited POs, suppliers, restock suggestions

Analytics:

All reports, custom date ranges, hourly breakdown


Scale Plan - $299/month
Target: Multi-location boutique (4-10 stores), power users, data-driven operators.
Everything in Core, plus:

Multi-Store: up to 10 stores (vs. 3 on Core)
Staff: unlimited staff accounts
Sales history: unlimited (vs. 12 months on Core)
Advanced alerts: low stock alerts sent via SMS (not just email)
Priority support: phone + chat (vs. email-only on Core/Starter)
API access (read-only, for custom integrations) ← Phase 2 feature, listed here for positioning

Limits:

10 stores max (hard cap to prevent enterprise use case)
Still no accounting, payroll, or ERP features


Feature Gate Enforcement
How Limits Are Enforced:

Store count: On Starter, "Add Store" button disabled with tooltip: "Upgrade to Core for multi-store"
Variant count: On Starter, at 5,000 variants, "Add Style" button shows error: "Variant limit reached. Upgrade to Core for unlimited."
Staff count: On Starter, at 2 users, "Add Staff" shows: "Max users reached. Upgrade to Core for up to 10 users."
Historical data: On Starter, date range picker maxes out at 30 days; older dates grayed out
Purchasing module: On Starter, Purchasing tab visible but "Create PO" button disabled; restock suggestions show with "Upgrade to create POs" CTA

Upgrade Flow:

In-app "Upgrade" button on all locked features
Clicking opens modal with plan comparison, Stripe checkout
Upgrade takes effect immediately (no downtime)


6. Demo-First UX Principles
VendoFlow is designed to demo beautifully. Every screen must feel instant, actionable, and opinionated.
Core UX Philosophy

Speed Obsession: Every interaction (button click, search, report load) must feel <1 second. No spinners on primary flows (POS checkout, product search, inventory lookup).
Data Surfaced, Not Buried: Critical metrics (dead stock count, low stock alerts, top sellers) visible on homepage dashboard. No drilling 3 levels deep for answers.
Opinionated Defaults: System makes decisions (e.g. 30-day target stock, 7-day reorder point). User can override, but defaults are smart enough to use as-is.
Mobile-First for POS: POS UI optimized for iPad/tablet (primary device). Desktop UI for back-office (inventory, analytics).
Zero Empty States: Demo account pre-loaded with sample boutique data (styles, sales, customers). No blank screens.


What Must Feel Instant

POS product search: <300ms from keystroke to results
Add to cart: <100ms (optimistic UI, no server round-trip before showing in cart)
Inventory lookup: <500ms to show stock levels across all stores
Dead stock report: Pre-calculated nightly; loads <1s
Heatmap rendering: <1s even for 50-variant style

Technical Implications:

Aggressive caching (Redis for inventory counts, pre-aggregated metrics)
Optimistic UI updates (show change immediately, sync in background)
Indexed database queries (composite indexes on variant_id + store_id, style_id + date)


What Must Never Appear in Demo

Blank states (pre-load sample data in demo accounts)
"Coming Soon" badges (only ship complete features)
Error messages during happy path (QA must eliminate all common error states)
Complex multi-step wizards (collapse into single-screen flows where possible)
Generic SaaS UI (no "Dashboard," "Settings," "Admin" — use boutique language: "Your Store," "Inventory," "Sales")


Screens That Must Exist for MVP
For POS (iPad/Tablet):

Sale Screen: Cart + product search + variant selector + checkout
Returns Screen: Search sale by receipt number, select items, process refund
Quick Inventory Lookup: Search variant, see stock count (no full inventory management on POS)

For Back-Office (Desktop/Web):

Dashboard (Home): Dead stock count, low stock alerts, today's sales, top sellers (last 7 days)
Products List: Table of all styles with search/filter
Product Detail: Style info + variant grid + sales performance + inventory by store
Inventory Intelligence: Dead stock report, sell-through table, heatmap viewer
Purchasing: Restock suggestions, PO list, create/edit PO, receive inventory
Sales Analytics: Revenue chart, top sellers, sales by store, payment breakdown
Customers List: Table with search, customer detail view
Multi-Store Inventory: Stock levels across stores, transfer interface
Staff Management: User list, add/edit users, activity log
Settings: Business profile, tax settings, receipt template, Stripe connection


Metrics the UI Must Surface Immediately (Dashboard)
Upon login, owner sees:

Today's Sales: Revenue, transaction count (vs. yesterday)
Low Stock Alerts: Count of variants below reorder point (red badge if >5)
Dead Stock Value: Total $ tied up in dead stock (e.g. "$2,400 in slow-moving inventory")
Top 3 Sellers (Last 7 Days): By revenue, with thumbnail images
Recent Activity: Last 5 sales (who, what, when)


7. Explicit Non-Goals (Critical)
These features are intentionally excluded from VendoFlow. If a prospect asks for these, they are not the target customer.
Accounting & Finance
Excluded:

General ledger (GL) integration
Chart of accounts
P&L statements, balance sheets
Tax filing (1099s, sales tax remittance)
Payroll processing
Invoicing for B2B sales

Why Excluded:
VendoFlow is not an accounting system. Boutiques already use QuickBooks, Xero, or an accountant for this. Adding accounting turns VendoFlow into a bloated ERP, which contradicts the "simple, fast, modern" positioning. Instead, VendoFlow exports sales data to CSV, which accountants can import into their system of choice.

Manufacturing & Supply Chain
Excluded:

Bill of materials (BOM)
Production planning
Work orders
Raw material tracking
Assembly/manufacturing workflows

Why Excluded:
Fashion boutiques are retailers, not manufacturers. They buy finished goods from suppliers. VendoFlow handles purchasing (POs) and receiving, but not production.

Deep ERP Workflows
Excluded:

Multi-currency (beyond USD)
Inter-company transfers (franchise/corporate structures)
Complex approval workflows (e.g. 3-tier PO approval)
Advanced logistics (shipping carriers, tracking, 3PL integration)
Warehouse management (bin locations, pick/pack/ship)

Why Excluded:
These are enterprise needs. VendoFlow targets independent boutiques (1-10 stores, <$5M revenue). If a prospect needs these, they should use NetSuite or similar.

E-Commerce Platform
Excluded (MVP):

Hosted online storefront (Shopify competitor)
Shopping
ContinueJan 20cart for consumers

Shopify/WooCommerce/Amazon integration
Shipping rate calculation
Online payment gateway (Stripe Checkout for consumers)

Why Excluded (for MVP):
VendoFlow POS handles in-store + manual online orders (phone, email). Full e-commerce integration is Phase 2 (post product-market fit). Owner can currently enter online orders manually into POS ("Pay Later" payment method).

Custom Client Logic
Excluded:

Custom fields/attributes beyond size/color
Workflow automation (Zapier-style)
Public API (until Scale plan, Phase 2)
Webhooks
White-label/reseller capabilities

Why Excluded:
VendoFlow is an opinionated product, not a platform. Customization creates support burden and slows velocity. The system is designed for fashion retail; if it doesn't fit, the customer should use a different tool.

Marketplace & Plugins
Excluded:

App store for third-party integrations
Plugin architecture
Embedding VendoFlow in other platforms

Why Excluded:
Marketplace creates fragmentation, security risks, and support complexity. VendoFlow ships with everything a fashion boutique needs. No assembly required.

Advanced Marketing Automation
Excluded:

Email campaign builder
SMS marketing
Loyalty points programs (beyond manual VIP tagging)
Referral tracking
Abandoned cart recovery (no e-commerce in MVP)

Why Excluded:
Boutiques already use Mailchimp, Klaviyo, or similar. VendoFlow exports customer lists to CSV for import into these tools. Building email marketing turns VendoFlow into a marketing platform, which dilutes focus.

8. Phase 2 (Post-Revenue, NOT MVP)
These features are explicitly deferred until VendoFlow has 50+ paying customers and $10K+ MRR.
Deferred Features

E-Commerce Integration:

Shopify/WooCommerce sync (auto-import online orders, sync inventory)
Amazon/eBay/Poshmark integrations
Condition: After validating that multi-channel is a top 3 customer request


Advanced Purchasing:

Automatic PO generation based on restock suggestions (one-click ordering)
Supplier catalog integration (import new styles from supplier)
Consignment inventory tracking
Condition: After 80% of Core users are actively using Purchasing module


Loyalty & Promotions:

Points-based loyalty program
Automated discounts (buy 2 get 1, spend $100 save $20)
Gift cards
Condition: After customer retention metrics prove loyalty is a revenue driver


Mobile Apps (Native):

iOS/Android POS app (currently web-based, works on iPad browser)
Mobile inventory scanning app
Condition: After 20+ users report needing offline-first POS (beyond current 50-transaction queue)


API & Webhooks:

Read/write API for custom integrations
Webhook events (sale.completed, inventory.low, etc.)
Condition: After 10+ Scale plan customers request API access


Advanced Analytics:

Cohort analysis (customer retention by acquisition month)
Sell-through forecasting (ML-based demand prediction)
SKU rationalization (recommend which styles to discontinue)
Condition: After analytics usage metrics show 60%+ of users access reports weekly


Multi-Currency & International:

Support for EUR, GBP, CAD, etc.
Multi-language UI
Country-specific tax rules (VAT, GST)
Condition: After 5+ international inquiries per month


Consignment & Vendor Management:

Track consignment inventory (goods owned by supplier, sold on commission)
Vendor invoicing (pay suppliers based on sell-through)
Condition: After validating that consignment is common in target market




Conditions for Adding Phase 2 Features
General Rule: No Phase 2 feature ships until:

Feature requested by 20%+ of active customers (via support tickets, feedback, or surveys)
MVP is stable (no critical bugs in backlog)
Core metrics hit targets:

50+ paying customers
$10K+ MRR
<5% monthly churn


70 NPS





Exception: Security, compliance, or scalability fixes ship immediately (not subject to Phase 2 rules).

9. Implementation Priorities & Build Sequence
This section guides the dev team on what to build first. The goal: ship a functional MVP in 12 weeks.
Week 1-2: Foundation

Database schema (all entities from Modules 3)
Authentication (email/password, session management)
Multi-tenant architecture (each boutique = separate account, data isolation)
Hosting setup (AWS/GCP, production + staging environments)

Week 3-4: Products & Inventory

Create/edit/archive ProductStyle
Variant generation (size × color matrix)
InventoryLevel tracking per store
Manual inventory adjustments (stock counts)

Week 5-6: POS (Core Flow)

Sale screen (cart, product search, variant selector)
Checkout (tax calculation, payment via Stripe Terminal)
Receipt generation (print + email)
Offline mode (queue sales, sync on reconnect)

Week 7: Inventory Intelligence (Basic)

Nightly job to calculate VariantMetrics (sell-through, days of inventory)
Dead stock report (sorted by inventory value)
Low stock alerts (email notifications)

Week 8: Purchasing

Restock suggestions (based on days of inventory)
Create/edit/send PO
Receive inventory (increment stock)

Week 9: Sales Analytics

DailySalesMetrics aggregation (nightly job)
Dashboard (revenue, units sold, top sellers)
Sales reports (by store, by style, by date range)

Week 10: Multi-Store & Transfers

Store CRUD (create/edit stores)
Inventory transfers (create, mark received)
Per-store inventory views

Week 11: Customers & Staff

Customer CRUD (add at POS, link to sales)
Staff roles (cashier, manager, owner)
Activity log (audit trail)

Week 12: Polish & Testing

Settings (business profile, tax, receipts)
QA (end-to-end testing, edge case handling)
Demo account setup (pre-loaded data)
Deploy to production


10. Technical Constraints & Assumptions
Tech Stack Assumptions (Dev Team Should Confirm)

Frontend: React (web app), responsive for tablet/desktop
Backend: Node.js (REST API) or Python (Django/Flask)
Database: PostgreSQL (relational, handles multi-tenant + complex queries)
Cache: Redis (inventory counts, metrics)
Payments: Stripe (Terminal for in-person, Checkout for online)
Hosting: AWS or GCP (scalable, reliable)
File Storage: S3 or equivalent (images, receipts, backups)

Performance Targets

POS checkout: <2 seconds from "Pay" button to receipt print
Inventory lookup: <500ms for any variant across all stores
Analytics load: <3 seconds for any report (pre-aggregated data)
Offline mode: Support 50 queued transactions, sync in <30 seconds

Scalability Assumptions

MVP Target: 100 boutiques, 10,000 sales/day, 500,000 variants
Database: Single PostgreSQL instance handles MVP scale; shard by customer_id if needed post-MVP
Offline mode: Client-side queue (IndexedDB), syncs via background task


11. Success Metrics (Post-Launch)
Product-Market Fit Indicators:

30-day retention: >60% of new customers still active after 30 days
Weekly active usage: >80% of customers log in at least once/week
Feature adoption: >70% of customers use Inventory Intelligence within first 14 days
NPS: >50 within first 60 days

Revenue Metrics:

Conversion (trial → paid): >40% of trials convert to Core plan
MRR Growth: $10K MRR within 6 months of launch
Churn: <5% monthly churn

Operational Metrics:

Support tickets: <2 tickets/customer/month
Uptime: >99.5%
Bugs (critical): <5 open critical bugs at any time


12. Final Engineering Handoff Checklist
Before starting development, confirm:

 All modules scoped (no ambiguity on what ships in MVP)
 Database schema reviewed (all entities + relationships defined)
 UX flows documented (step-by-step for all primary workflows)
 Feature gating understood (Starter vs. Core vs. Scale limits)
 Inventory intelligence logic validated (formulas, thresholds, edge cases)
 Offline mode requirements clear (50-transaction queue, sync behavior)
 Payment integration scoped (Stripe Terminal setup, testing plan)
 Demo data plan defined (sample boutique, styles, sales for demo accounts)
 Non-goals acknowledged (no accounting, no ERP, no customization)
 Phase 2 boundary understood (what explicitly waits until post-revenue)


END OF BLUEPRINT
This document is the single source of truth for building VendoFlow MVP. Any feature not explicitly listed here is out of scope. Any ambiguity should be resolved by referring back to the core problem: helping fashion boutiques eliminate inventory blindness at the variant level.
