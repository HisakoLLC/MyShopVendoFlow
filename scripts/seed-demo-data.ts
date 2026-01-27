/**
 * Demo Data Seeder
 * Populates new accounts with realistic sample data for testing and onboarding
 */

import { createServerSupabaseClient } from "@/lib/supabase/server"
import { v4 as uuidv4 } from "uuid"

// Simple faker-like functions (no external dependency)
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomFloat(min: number, max: number, decimals: number = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)]
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

// Sample data generators
const firstNames = [
  "Sarah", "James", "Emily", "Michael", "Olivia", "David", "Sophia", "Daniel",
  "Emma", "Matthew", "Isabella", "Christopher", "Ava", "Andrew", "Mia",
  "Joshua", "Charlotte", "Joseph", "Amelia", "William"
]

const lastNames = [
  "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez",
  "Martinez", "Hernandez", "Lopez", "Wilson", "Anderson", "Thomas", "Taylor",
  "Moore", "Jackson", "Martin", "Lee", "Thompson"
]

function generateName(): { firstName: string; lastName: string } {
  return {
    firstName: randomChoice(firstNames),
    lastName: randomChoice(lastNames),
  }
}

function generateEmail(firstName: string, lastName: string): string {
  const domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"]
  return `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${randomChoice(domains)}`
}

function generatePhone(): string {
  // Kenya phone format: 2547XXXXXXXX
  return `2547${randomInt(10000000, 99999999)}`
}

type Category = {
  category_id: string
  name: string
}

type Season = {
  season_id: string
  name: string
}

type Supplier = {
  supplier_id: string
  name: string
}

type ProductStyle = {
  style_id: string
  name: string
  category_id: string | null
  season_id: string | null
  base_price: number
  cost: number
}

type Variant = {
  variant_id: string
  style_id: string | null
  size: string
  color: string
  sku: string
}

type Customer = {
  customer_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  is_vip: boolean
}

/**
 * Seed Categories
 */
async function seedCategories(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  accountId: string
): Promise<Category[]> {
  const categoryNames = ["Dresses", "Tops", "Bottoms", "Accessories", "Outerwear"]
  const categories: Category[] = []

  for (const name of categoryNames) {
    const categoryId = uuidv4()
    const { data, error } = await supabase.from("categories").insert({
      category_id: categoryId,
      account_id: accountId,
      name: name,
    }).select("category_id, name").single()

    if (!error && data) {
      categories.push({ category_id: data.category_id, name: data.name })
    }
  }

  return categories
}

/**
 * Seed Seasons
 */
async function seedSeasons(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  accountId: string
): Promise<Season[]> {
  const seasonData = [
    {
      name: "Spring/Summer 2025",
      start_date: "2025-03-01",
      end_date: "2025-08-31",
    },
    {
      name: "Fall/Winter 2025",
      start_date: "2025-09-01",
      end_date: "2026-02-28",
    },
  ]

  const seasons: Season[] = []

  for (const season of seasonData) {
    const seasonId = uuidv4()
    const { data, error } = await supabase.from("seasons").insert({
      season_id: seasonId,
      account_id: accountId,
      name: season.name,
      start_date: season.start_date,
      end_date: season.end_date,
    }).select("season_id, name").single()

    if (!error && data) {
      seasons.push({ season_id: data.season_id, name: data.name })
    }
  }

  return seasons
}

/**
 * Seed Suppliers
 */
async function seedSuppliers(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  accountId: string
): Promise<Supplier[]> {
  const supplierData = [
    {
      name: "Bella Fabrics Co.",
      email: "bella@example.com",
      payment_terms: "Net 30",
    },
    {
      name: "Urban Styles Inc.",
      email: "urban@example.com",
      payment_terms: "Net 45",
    },
  ]

  const suppliers: Supplier[] = []

  for (const supplier of supplierData) {
    const supplierId = uuidv4()
    const { data, error } = await supabase.from("suppliers").insert({
      supplier_id: supplierId,
      account_id: accountId,
      name: supplier.name,
      email: supplier.email,
      payment_terms: supplier.payment_terms,
    }).select("supplier_id, name").single()

    if (!error && data) {
      suppliers.push({ supplier_id: data.supplier_id, name: data.name })
    }
  }

  return suppliers
}

/**
 * Seed Product Styles
 */
async function seedProductStyles(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  accountId: string,
  categories: Category[],
  seasons: Season[]
): Promise<ProductStyle[]> {
  const styleData = [
    {
      name: "Floral Maxi Dress",
      category: "Dresses",
      season: "Spring/Summer 2025",
      base_price: 85,
      cost: 35,
      description: "Elegant floral print maxi dress perfect for summer occasions",
    },
    {
      name: "Linen Blazer",
      category: "Outerwear",
      season: "Spring/Summer 2025",
      base_price: 120,
      cost: 50,
      description: "Lightweight linen blazer for professional summer wear",
    },
    {
      name: "Crop Top",
      category: "Tops",
      season: "Spring/Summer 2025",
      base_price: 45,
      cost: 18,
      description: "Trendy crop top in various colors",
    },
    {
      name: "High-Waisted Jeans",
      category: "Bottoms",
      season: "Fall/Winter 2025",
      base_price: 95,
      cost: 40,
      description: "Classic high-waisted denim jeans",
    },
    {
      name: "Silk Midi Skirt",
      category: "Bottoms",
      season: "Spring/Summer 2025",
      base_price: 75,
      cost: 30,
      description: "Flowing silk midi skirt with elegant drape",
    },
    {
      name: "Oversized Sweater",
      category: "Tops",
      season: "Fall/Winter 2025",
      base_price: 90,
      cost: 38,
      description: "Comfortable oversized knit sweater",
    },
    {
      name: "Leather Jacket",
      category: "Outerwear",
      season: "Fall/Winter 2025",
      base_price: 250,
      cost: 110,
      description: "Premium genuine leather jacket",
    },
    {
      name: "Statement Necklace",
      category: "Accessories",
      season: "Spring/Summer 2025",
      base_price: 35,
      cost: 12,
      description: "Bold statement necklace for special occasions",
    },
    {
      name: "Wide-Brim Hat",
      category: "Accessories",
      season: "Spring/Summer 2025",
      base_price: 40,
      cost: 15,
      description: "Stylish wide-brim sun hat",
    },
    {
      name: "Pleated Trousers",
      category: "Bottoms",
      season: "Fall/Winter 2025",
      base_price: 85,
      cost: 35,
      description: "Classic pleated trousers for office wear",
    },
  ]

  const styles: ProductStyle[] = []
  const sizes = ["XS", "S", "M", "L", "XL"]
  const colorPalettes: Record<string, string[]> = {
    "Floral Maxi Dress": ["Navy", "Coral", "Sage"],
    "Linen Blazer": ["Beige", "Navy", "White"],
    "Crop Top": ["Black", "White", "Coral"],
    "High-Waisted Jeans": ["Navy", "Black", "Olive"],
    "Silk Midi Skirt": ["Burgundy", "Navy", "Sage"],
    "Oversized Sweater": ["Olive", "Burgundy", "Beige"],
    "Leather Jacket": ["Black", "Olive", "Burgundy"],
    "Statement Necklace": ["Gold", "Silver", "Rose Gold"],
    "Wide-Brim Hat": ["Beige", "Black", "Navy"],
    "Pleated Trousers": ["Navy", "Black", "Olive"],
  }

  for (const style of styleData) {
    const category = categories.find((c) => c.name === style.category)
    const season = seasons.find((s) => s.name === style.season)

    if (!category) continue

    const styleId = uuidv4()
    const { data, error } = await supabase.from("product_styles").insert({
      style_id: styleId,
      account_id: accountId,
      name: style.name,
      category_id: category.category_id,
      season_id: season?.season_id || null,
      base_price: style.base_price,
      cost: style.cost,
      description: style.description,
      image_url: "/placeholder-product.png",
      archived: false,
    }).select("style_id, name, category_id, season_id, base_price, cost").single()

    if (!error && data) {
      styles.push({
        style_id: data.style_id,
        name: data.name,
        category_id: data.category_id,
        season_id: data.season_id,
        base_price: data.base_price,
        cost: data.cost,
      })
    }
  }

  return styles
}

/**
 * Seed Variants
 */
async function seedVariants(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  styles: ProductStyle[]
): Promise<Variant[]> {
  const sizes = ["XS", "S", "M", "L", "XL"]
  const colorPalettes: Record<string, string[]> = {
    "Floral Maxi Dress": ["Navy", "Coral", "Sage"],
    "Linen Blazer": ["Beige", "Navy", "White"],
    "Crop Top": ["Black", "White", "Coral"],
    "High-Waisted Jeans": ["Navy", "Black", "Olive"],
    "Silk Midi Skirt": ["Burgundy", "Navy", "Sage"],
    "Oversized Sweater": ["Olive", "Burgundy", "Beige"],
    "Leather Jacket": ["Black", "Olive", "Burgundy"],
    "Statement Necklace": ["Gold", "Silver", "Rose Gold"],
    "Wide-Brim Hat": ["Beige", "Black", "Navy"],
    "Pleated Trousers": ["Navy", "Black", "Olive"],
  }

  const variants: Variant[] = []

  for (const style of styles) {
    const colors = colorPalettes[style.name] || ["Black", "White", "Navy"]

    for (const size of sizes) {
      for (const color of colors) {
        const variantId = uuidv4()
        const sku = `${style.name.substring(0, 3).toUpperCase()}-${size}-${color.substring(0, 3).toUpperCase()}-${randomInt(1000, 9999)}`

        const { data, error } = await supabase.from("product_variants").insert({
          variant_id: variantId,
          style_id: style.style_id,
          size: size,
          color: color,
          sku: sku,
        }).select("variant_id, style_id, size, color, sku").single()

        if (!error && data) {
          variants.push({
            variant_id: data.variant_id,
            style_id: data.style_id,
            size: data.size,
            color: data.color,
            sku: data.sku,
          })
        }
      }
    }
  }

  return variants
}

/**
 * Seed Inventory Levels
 */
async function seedInventoryLevels(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  variants: Variant[],
  storeId: string
): Promise<void> {
  for (const variant of variants) {
    // Randomize stock: 0-20 units, with some having 0 (out of stock)
    // 20% chance of 0 stock, 30% chance of low stock (1-5), 50% chance of healthy stock (6-20)
    let quantity = 0
    const rand = Math.random()
    if (rand < 0.2) {
      quantity = 0 // Out of stock
    } else if (rand < 0.5) {
      quantity = randomInt(1, 5) // Low stock
    } else {
      quantity = randomInt(6, 20) // Healthy stock
    }

    await supabase.from("inventory_levels").insert({
      variant_id: variant.variant_id,
      store_id: storeId,
      quantity_on_hand: quantity,
      quantity_reserved: 0,
      last_counted_date: new Date().toISOString(),
    })
  }
}

/**
 * Seed Customers
 */
async function seedCustomers(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  accountId: string
): Promise<Customer[]> {
  const customers: Customer[] = []

  for (let i = 0; i < 8; i++) {
    const { firstName, lastName } = generateName()
    const email = generateEmail(firstName, lastName)
    const phone = generatePhone()
    const isVip = Math.random() < 0.3 // 30% VIP

    const customerId = uuidv4()
    const { data, error } = await supabase.from("customers").insert({
      customer_id: customerId,
      account_id: accountId,
      first_name: firstName,
      last_name: lastName,
      email: email,
      phone: phone,
      is_vip: isVip,
      total_spend: 0, // Will be updated after sales
      transaction_count: 0,
    }).select("customer_id, first_name, last_name, email, phone, is_vip").single()

    if (!error && data) {
      customers.push({
        customer_id: data.customer_id,
        first_name: data.first_name || firstName,
        last_name: data.last_name || lastName,
        email: data.email || email,
        phone: data.phone || phone,
        is_vip: data.is_vip || false,
      })
    }
  }

  return customers
}

/**
 * Seed Sales
 */
async function seedSales(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  accountId: string,
  storeId: string,
  variants: Variant[],
  customers: Customer[]
): Promise<void> {
  const paymentMethods = ["mpesa", "cash", "card"]
  const paymentWeights = [0.6, 0.3, 0.1] // 60% M-Pesa, 30% Cash, 10% Card

  function weightedRandomChoice<T>(items: T[], weights: number[]): T {
    const totalWeight = weights.reduce((sum, w) => sum + w, 0)
    let random = Math.random() * totalWeight
    for (let i = 0; i < items.length; i++) {
      random -= weights[i]
      if (random <= 0) return items[i]
    }
    return items[items.length - 1]
  }

  // Generate 30 sales over the last 90 days (more recent = more sales)
  const now = new Date()
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  // Get user ID (use a placeholder or fetch from account_members)
  const { data: accountMember } = await supabase
    .from("account_members")
    .select("user_id")
    .eq("account_id", accountId)
    .eq("role", "owner")
    .limit(1)
    .single()

  const cashierId = accountMember?.user_id || "00000000-0000-0000-0000-000000000000"

  for (let i = 0; i < 30; i++) {
    // More recent dates are more likely (exponential distribution)
    const daysAgo = Math.pow(Math.random(), 1.5) * 90 // Bias towards recent
    const saleDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000)

    // Link to customer 70% of the time
    const customer = Math.random() < 0.7 ? randomChoice(customers) : null

    // Generate receipt number
    const dateStr = saleDate.toISOString().split("T")[0].replace(/-/g, "")
    const receiptNum = `STORE-${dateStr}-${String(i + 1).padStart(5, "0")}`

    // 2-4 line items per sale
    const numItems = randomInt(2, 4)
    const selectedVariants = []
    for (let j = 0; j < numItems; j++) {
      const variant = randomChoice(variants)
      const quantity = randomInt(1, 3)
      selectedVariants.push({ variant, quantity })
    }

    // Calculate totals
    let subtotal = 0
    const lineItems = []
    for (const { variant, quantity } of selectedVariants) {
      // Skip if style_id is missing
      if (!variant.style_id) {
        continue
      }

      // Find style for base price
      const { data: style } = await supabase
        .from("product_styles")
        .select("base_price")
        .eq("style_id", variant.style_id)
        .single()

      const unitPrice = style?.base_price || 50
      const lineTotal = unitPrice * quantity
      subtotal += lineTotal

      lineItems.push({
        variant_id: variant.variant_id,
        quantity: quantity,
        unit_price: unitPrice,
        tax_amount: (lineTotal * 0.16) / 1.16,
        line_total: lineTotal,
      })
    }

    const taxTotal = subtotal * 0.16
    const grandTotal = subtotal + taxTotal

    const paymentMethod = weightedRandomChoice(paymentMethods, paymentWeights)

    // Create sale
    const saleId = uuidv4()
    const { data: sale, error: saleError } = await supabase.from("sales").insert({
      sale_id: saleId,
      store_id: storeId,
      cashier_id: cashierId,
      customer_id: customer?.customer_id || null,
      subtotal: subtotal,
      tax_total: taxTotal,
      grand_total: grandTotal,
      payment_method: paymentMethod,
      receipt_number: receiptNum,
      status: "completed",
      sale_date: saleDate.toISOString(),
    }).select("sale_id").single()

    if (saleError || !sale) continue

    // Create line items
    const lineItemsWithSaleId = lineItems.map((item) => ({
      ...item,
      sale_id: sale.sale_id,
    }))

    await supabase.from("sale_line_items").insert(lineItemsWithSaleId)

    // Update customer stats
    if (customer) {
      const { data: currentCustomer } = await supabase
        .from("customers")
        .select("total_spend, transaction_count, first_purchase_date")
        .eq("customer_id", customer.customer_id)
        .single()

      if (currentCustomer) {
        const newTotalSpend = (currentCustomer.total_spend || 0) + grandTotal
        const newTransactionCount = (currentCustomer.transaction_count || 0) + 1
        const firstPurchaseDate = currentCustomer.first_purchase_date || saleDate.toISOString()

        await supabase
          .from("customers")
          .update({
            total_spend: newTotalSpend,
            transaction_count: newTransactionCount,
            last_purchase_date: saleDate.toISOString(),
            first_purchase_date: firstPurchaseDate,
          })
          .eq("customer_id", customer.customer_id)
      }
    }

    // Decrement inventory
    for (const { variant, quantity } of selectedVariants) {
      const { data: inventory } = await supabase
        .from("inventory_levels")
        .select("inventory_id, quantity_on_hand")
        .eq("variant_id", variant.variant_id)
        .eq("store_id", storeId)
        .single()

      if (inventory) {
        const newQuantity = Math.max(0, (inventory.quantity_on_hand || 0) - quantity)
        await supabase
          .from("inventory_levels")
          .update({ quantity_on_hand: newQuantity })
          .eq("inventory_id", inventory.inventory_id)
      }
    }
  }
}

/**
 * Calculate Variant Metrics
 */
async function calculateDemoMetrics(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  variants: Variant[]
): Promise<void> {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  for (const variant of variants) {
    // Get inventory level
    const { data: inventory } = await supabase
      .from("inventory_levels")
      .select("quantity_on_hand")
      .eq("variant_id", variant.variant_id)
      .limit(1)
      .single()

    const currentStock = inventory?.quantity_on_hand || 0

    // Get sales data for different periods
    const { data: sales30d } = await supabase
      .from("sale_line_items")
      .select("quantity, sales!inner(sale_date)")
      .eq("variant_id", variant.variant_id)
      .gte("sales.sale_date", thirtyDaysAgo.toISOString())

    const { data: sales60d } = await supabase
      .from("sale_line_items")
      .select("quantity, sales!inner(sale_date)")
      .eq("variant_id", variant.variant_id)
      .gte("sales.sale_date", sixtyDaysAgo.toISOString())

    const { data: sales90d } = await supabase
      .from("sale_line_items")
      .select("quantity, sales!inner(sale_date)")
      .eq("variant_id", variant.variant_id)
      .gte("sales.sale_date", ninetyDaysAgo.toISOString())

    const sold30d = sales30d?.reduce((sum: number, item: { quantity: number | null }) => sum + (item.quantity || 0), 0) || 0
    const sold60d = sales60d?.reduce((sum: number, item: { quantity: number | null }) => sum + (item.quantity || 0), 0) || 0
    const sold90d = sales90d?.reduce((sum: number, item: { quantity: number | null }) => sum + (item.quantity || 0), 0) || 0

    // Calculate sell-through rates (simplified: units_sold / (current_stock + units_sold))
    const totalStock30d = currentStock + sold30d
    const sellThrough30d = totalStock30d > 0 ? (sold30d / totalStock30d) * 100 : 0

    const totalStock60d = currentStock + sold60d
    const sellThrough60d = totalStock60d > 0 ? (sold60d / totalStock60d) * 100 : 0

    const totalStock90d = currentStock + sold90d
    const sellThrough90d = totalStock90d > 0 ? (sold90d / totalStock90d) * 100 : 0

    // Average daily sales (last 30 days)
    const avgDailySales30d = sold30d / 30

    // Days of inventory
    const daysOfInventory = avgDailySales30d > 0 ? currentStock / avgDailySales30d : null

    // Restock urgency score (0-100, higher = more urgent)
    let restockUrgencyScore: number
    if (currentStock === 0) {
      restockUrgencyScore = 100
    } else if (daysOfInventory !== null) {
      if (daysOfInventory < 7) {
        restockUrgencyScore = Math.min(100, 90 - daysOfInventory * 5)
      } else if (daysOfInventory < 30) {
        restockUrgencyScore = Math.max(20, 50 - (daysOfInventory - 7) * 1.5)
      } else {
        restockUrgencyScore = Math.max(0, 20 - (daysOfInventory - 30) * 0.5)
      }
    } else {
      // No sales, but has stock - low urgency unless it's dead stock
      restockUrgencyScore = sold90d === 0 && currentStock > 10 ? 5 : 10
    }

    // Determine stock health
    let stockHealth: string
    if (currentStock === 0) {
      stockHealth = "out_of_stock"
    } else if (daysOfInventory !== null && daysOfInventory < 7) {
      stockHealth = "low_stock"
    } else if (sellThrough90d < 10 && currentStock > 3) {
      stockHealth = "dead_stock"
    } else {
      stockHealth = "healthy"
    }

    // Upsert variant metrics
    await supabase.from("variant_metrics").upsert({
      variant_id: variant.variant_id,
      sell_through_30d: sellThrough30d,
      sell_through_60d: sellThrough60d,
      sell_through_90d: sellThrough90d,
      avg_daily_sales_30d: avgDailySales30d,
      days_of_inventory: daysOfInventory,
      restock_urgency_score: restockUrgencyScore,
      stock_health: stockHealth,
      last_calculated: now.toISOString(),
    })
  }
}

/**
 * Main Seeder Function
 */
export async function seedDemoData(accountId: string, storeId: string) {
  const supabase = await createServerSupabaseClient()

  try {
    // 1. Seed categories
    console.log("Seeding categories...")
    const categories = await seedCategories(supabase, accountId)

    // 2. Seed seasons
    console.log("Seeding seasons...")
    const seasons = await seedSeasons(supabase, accountId)

    // 3. Seed suppliers
    console.log("Seeding suppliers...")
    const suppliers = await seedSuppliers(supabase, accountId)

    // 4. Seed product styles
    console.log("Seeding product styles...")
    const styles = await seedProductStyles(supabase, accountId, categories, seasons)

    // 5. Seed variants
    console.log("Seeding variants...")
    const variants = await seedVariants(supabase, styles)

    // 6. Seed inventory levels
    console.log("Seeding inventory levels...")
    await seedInventoryLevels(supabase, variants, storeId)

    // 7. Seed customers
    console.log("Seeding customers...")
    const customers = await seedCustomers(supabase, accountId)

    // 8. Seed sales
    console.log("Seeding sales...")
    await seedSales(supabase, accountId, storeId, variants, customers)

    // 9. Calculate variant metrics
    console.log("Calculating variant metrics...")
    await calculateDemoMetrics(supabase, variants)

    // Mark account as having demo data (if column exists)
    try {
      await (supabase as any)
        .from("accounts")
        .update({ has_demo_data: true })
        .eq("account_id", accountId)
    } catch (error) {
      // Column might not exist yet - that's okay
      console.warn("Could not update has_demo_data flag (column may not exist):", error)
    }

    return {
      success: true,
      message: "Demo data seeded successfully",
      counts: {
        categories: categories.length,
        seasons: seasons.length,
        suppliers: suppliers.length,
        styles: styles.length,
        variants: variants.length,
        customers: customers.length,
        sales: 30,
      },
    }
  } catch (error) {
    console.error("Error seeding demo data:", error)
    throw new Error(
      `Failed to seed demo data: ${error instanceof Error ? error.message : "Unknown error"}`
    )
  }
}
