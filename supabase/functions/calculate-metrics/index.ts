import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface VariantMetric {
  variant_id: string
  sell_through_30d: number | null
  sell_through_60d: number | null
  sell_through_90d: number | null
  avg_daily_sales_30d: number | null
  days_of_inventory: number | null
  restock_urgency_score: number | null
  stock_health: string | null
  last_calculated: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client with service role key (bypasses RLS)
    // Supabase Edge Functions automatically provide SUPABASE_URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? 
                        Deno.env.get("SUPABASE_PROJECT_URL") ??
                        req.headers.get("x-supabase-url") ??
                        "https://gipmbcmzmbddavelbayk.supabase.co"
    
    // Try multiple ways to get service role key
    // 1. System environment (Supabase may provide this automatically)
    // 2. Custom secret (SERVICE_ROLE_KEY) - this is what you set in the dashboard
    // 3. Request header (if Supabase provides it)
    // Note: Supabase Edge Functions may automatically provide SUPABASE_SERVICE_ROLE_KEY
    // but if not, you need to set SERVICE_ROLE_KEY as a secret
    
    // Try to get service role key
    // IMPORTANT: Check SERVICE_ROLE_KEY first (user-set secret), then SUPABASE_SERVICE_ROLE_KEY
    // Supabase may auto-provide SUPABASE_SERVICE_ROLE_KEY but it might be the anon key
    // We prioritize the user-set SERVICE_ROLE_KEY secret
    const serviceRoleKeyFromSecret = Deno.env.get("SERVICE_ROLE_KEY")
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    
    // Use SERVICE_ROLE_KEY if available, otherwise fall back to SUPABASE_SERVICE_ROLE_KEY
    // But validate that it looks like a service role key (starts with eyJ and is long enough)
    let supabaseServiceKey = serviceRoleKeyFromSecret ?? supabaseServiceRoleKey
    
    // If we got SUPABASE_SERVICE_ROLE_KEY but it's too short (likely anon key), use SERVICE_ROLE_KEY instead
    if (supabaseServiceKey === supabaseServiceRoleKey && supabaseServiceKey && supabaseServiceKey.length < 100) {
      console.warn("SUPABASE_SERVICE_ROLE_KEY appears to be anon key (too short), trying SERVICE_ROLE_KEY")
      supabaseServiceKey = serviceRoleKeyFromSecret ?? null
    }
    
    // Final fallback to header
    if (!supabaseServiceKey) {
      supabaseServiceKey = req.headers.get("x-supabase-service-role-key")
    }

    // Debug info (don't log actual key)
    // Check which environment variables are available (for debugging)
    const envVarStatus = {
      hasSUPABASE_SERVICE_ROLE_KEY: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      hasSERVICE_ROLE_KEY: !!Deno.env.get("SERVICE_ROLE_KEY"),
      SUPABASE_SERVICE_ROLE_KEY_length: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.length || 0,
      SERVICE_ROLE_KEY_length: Deno.env.get("SERVICE_ROLE_KEY")?.length || 0,
    }

    const debugInfo = {
      hasServiceKey: !!supabaseServiceKey,
      serviceKeyLength: supabaseServiceKey?.length || 0,
      serviceKeyPrefix: supabaseServiceKey ? supabaseServiceKey.substring(0, 10) + "..." : "none",
      supabaseUrl,
      envVarsChecked: [
        "SUPABASE_SERVICE_ROLE_KEY",
        "SERVICE_ROLE_KEY"
      ],
      envVarStatus
    }

    if (!supabaseServiceKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Service role key is not set",
          debug: debugInfo,
          hint: "Add SERVICE_ROLE_KEY as a secret in Edge Function settings",
          instructions: [
            "1. Go to Supabase Dashboard → Edge Functions → calculate-metrics",
            "2. Click 'Settings' or 'Secrets' tab",
            "3. Add new secret:",
            "   - Name: SERVICE_ROLE_KEY (exact, case-sensitive)",
            "   - Value: your service_role key from Project Settings → API",
            "4. Get service_role key from: Project Settings → API → service_role (secret key)",
            "5. After adding, click 'Deploy' or 'Save' to redeploy the function",
            "6. Wait 10-30 seconds for secrets to propagate"
          ]
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      )
    }

    // Clean the key (remove any whitespace and newlines)
    // Then let Supabase validate it directly - it will give better error messages
    const cleanedKey = supabaseServiceKey.trim().replace(/\s+/g, "")
    const supabaseServiceKeyFinal = cleanedKey

    // Enhanced debug info - decode JWT to verify it's actually a service_role key
    let jwtPayload = null
    let jwtRole = null
    let jwtDecodeError = null
    try {
      const parts = cleanedKey.split(".")
      if (parts.length === 3) {
        // Decode the payload (second part)
        const payloadBase64 = parts[1]
        // Add padding if needed
        const padded = payloadBase64 + '='.repeat((4 - payloadBase64.length % 4) % 4)
        jwtPayload = JSON.parse(atob(padded))
        jwtRole = jwtPayload.role || null
      } else {
        jwtDecodeError = `JWT has ${parts.length} parts, expected 3`
      }
    } catch (e) {
      jwtDecodeError = e instanceof Error ? e.message : String(e)
      console.error("JWT decode error:", jwtDecodeError)
    }

    const keyDebugInfo = {
      originalLength: supabaseServiceKey.length,
      cleanedLength: cleanedKey.length,
      first10Chars: cleanedKey.substring(0, 10),
      last10Chars: cleanedKey.substring(Math.max(0, cleanedKey.length - 10)),
      startsWithEyJ: cleanedKey.startsWith("eyJ"),
      jwtRole: jwtRole,
      isServiceRole: jwtRole === "service_role",
      jwtDecodeError: jwtDecodeError,
      jwtPayloadKeys: jwtPayload ? Object.keys(jwtPayload).filter(k => k !== 'iat' && k !== 'exp' && k !== 'aud') : null,
      keySource: serviceRoleKeyFromSecret ? "SERVICE_ROLE_KEY" 
        : supabaseServiceRoleKey ? "SUPABASE_SERVICE_ROLE_KEY"
        : "header"
    }

    console.log("=== KEY DEBUG INFO ===")
    console.log(JSON.stringify(keyDebugInfo, null, 2))
    console.log("=== ENVIRONMENT CHECK ===")
    console.log(JSON.stringify({
      SUPABASE_SERVICE_ROLE_KEY_exists: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      SERVICE_ROLE_KEY_exists: !!Deno.env.get("SERVICE_ROLE_KEY"),
      keyLength: supabaseServiceKeyFinal.length,
      keyStartsWithEyJ: supabaseServiceKeyFinal.startsWith("eyJ"),
      jwtRole: jwtRole,
      isServiceRole: jwtRole === "service_role"
    }, null, 2))

    // Verify it's actually a service_role key
    if (jwtRole && jwtRole !== "service_role") {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Invalid key type: Expected 'service_role' but got '${jwtRole}'`,
          hint: "You may have copied the 'anon' key instead of the 'service_role' key",
          debug: keyDebugInfo,
          instructions: [
            "1. Go to Supabase Dashboard → Project Settings → API",
            "2. Scroll down to find 'service_role' key (NOT 'anon' key)",
            "3. Click the eye icon to reveal it",
            "4. Click 'Copy' to copy the full key",
            "5. Paste it as SERVICE_ROLE_KEY secret in Edge Function settings"
          ]
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      )
    }

    // Create client with service role key (bypasses RLS)
    // Match the pattern from lib/supabase.ts - simple initialization without extra headers
    // The service role key in the second parameter should be sufficient
    const supabase = createClient(supabaseUrl, supabaseServiceKeyFinal, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Fetch all product variants (now that we've verified access)
    const { data: variants, error: variantsError } = await supabase
      .from("product_variants")
      .select("variant_id")

    if (variantsError) {
      console.error("Variants query error:", variantsError)
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to fetch variants: ${variantsError.message}`,
          details: {
            code: variantsError.code,
            hint: variantsError.hint
          }
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      )
    }

    if (!variants || variants.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No variants found", processed: 0 }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      )
    }

    const now = new Date()
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const sixtyDaysAgo = new Date(now)
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)
    const ninetyDaysAgo = new Date(now)
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

    const metrics: VariantMetric[] = []
    let processedCount = 0
    let errorCount = 0

    // Process each variant
    for (const variant of variants) {
      try {
        const variantId = variant.variant_id

        // Get current stock (aggregated across all stores)
        const { data: inventoryLevels, error: inventoryError } = await supabase
          .from("inventory_levels")
          .select("quantity_on_hand")
          .eq("variant_id", variantId)

        const currentStock =
          inventoryLevels?.reduce((sum, level) => sum + (level.quantity_on_hand || 0), 0) || 0

        // Calculate sell-through rates for 30d, 60d, 90d
        const sellThrough30d = await calculateSellThrough(
          supabase,
          variantId,
          thirtyDaysAgo,
          now,
          currentStock
        )
        const sellThrough60d = await calculateSellThrough(
          supabase,
          variantId,
          sixtyDaysAgo,
          now,
          currentStock
        )
        const sellThrough90d = await calculateSellThrough(
          supabase,
          variantId,
          ninetyDaysAgo,
          now,
          currentStock
        )

        // Calculate average daily sales (30d)
        const { data: sales30d, error: salesError } = await supabase
          .from("sale_line_items")
          .select("quantity, sales!inner(sale_date)")
          .eq("variant_id", variantId)
          .gte("sales.sale_date", thirtyDaysAgo.toISOString())
          .lte("sales.sale_date", now.toISOString())

        const unitsSold30d =
          sales30d?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
        const avgDailySales30d = unitsSold30d / 30

        // Calculate days of inventory
        const daysOfInventory =
          avgDailySales30d > 0 ? currentStock / avgDailySales30d : 999

        // Calculate restock urgency score
        // Formula: (100 - days_of_inventory) + (sell_through_90d × 0.5), capped at 100
        const sellThrough90dValue = sellThrough90d || 0
        const urgencyScore = Math.min(
          100,
          Math.max(0, 100 - daysOfInventory + sellThrough90dValue * 0.5)
        )

        // Determine stock health
        let stockHealth: string
        if (currentStock === 0) {
          stockHealth = "out_of_stock"
        } else if (daysOfInventory < 7) {
          stockHealth = "low_stock"
        } else if ((sellThrough90d || 0) < 10 && currentStock > 3) {
          stockHealth = "dead_stock"
        } else {
          stockHealth = "healthy"
        }

        metrics.push({
          variant_id: variantId,
          sell_through_30d: sellThrough30d,
          sell_through_60d: sellThrough60d,
          sell_through_90d: sellThrough90d,
          avg_daily_sales_30d: avgDailySales30d,
          days_of_inventory: daysOfInventory === 999 ? null : daysOfInventory,
          restock_urgency_score: urgencyScore,
          stock_health: stockHealth,
          last_calculated: now.toISOString(),
        })

        processedCount++
      } catch (error) {
        console.error(`Error processing variant ${variant.variant_id}:`, error)
        errorCount++
        // Continue to next variant
      }
    }

    // Upsert metrics in batches (Supabase has a limit of 1000 rows per insert)
    const batchSize = 1000
    for (let i = 0; i < metrics.length; i += batchSize) {
      const batch = metrics.slice(i, i + batchSize)
      const { error: upsertError } = await supabase
        .from("variant_metrics")
        .upsert(batch, { onConflict: "variant_id" })

      if (upsertError) {
        console.error(`Error upserting batch ${i / batchSize + 1}:`, upsertError)
        throw new Error(`Failed to upsert metrics: ${upsertError.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedCount} variants successfully`,
        processed: processedCount,
        errors: errorCount,
        timestamp: now.toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (error) {
    console.error("Function error:", error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    )
  }
})

/**
 * Calculate sell-through rate for a variant over a date range
 * Formula: (units_sold / (starting_inventory + units_received)) × 100
 * 
 * We approximate:
 * - units_sold: sum of quantities from sale_line_items in the period
 * - starting_inventory: current_stock + units_sold - units_received
 * - units_received: from inventory_receipts (if available)
 * 
 * This gives us: units_sold / (current_stock + units_sold - units_received) × 100
 * 
 * Note: If inventory_receipts data is not available, we use:
 * units_sold / (current_stock + units_sold) × 100
 */
async function calculateSellThrough(
  supabase: any,
  variantId: string,
  startDate: Date,
  endDate: Date,
  currentStock: number
): Promise<number | null> {
  try {
    // Get units sold in the period
    const { data: sales, error: salesError } = await supabase
      .from("sale_line_items")
      .select("quantity, sales!inner(sale_date)")
      .eq("variant_id", variantId)
      .gte("sales.sale_date", startDate.toISOString())
      .lte("sales.sale_date", endDate.toISOString())

    if (salesError) {
      console.error(`Error fetching sales for variant ${variantId}:`, salesError)
      return null
    }

    const unitsSold = sales?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0

    // If no sales, return 0 (not null, as 0% is meaningful)
    if (unitsSold === 0) {
      return 0
    }

    // Try to get units received in the period (from inventory_receipts)
    // Note: This assumes inventory_receipts.line_items_received is a JSON array
    // with structure: [{ variant_id, quantity }, ...]
    let unitsReceived = 0
    try {
      const { data: receipts, error: receiptsError } = await supabase
        .from("inventory_receipts")
        .select("line_items_received, received_date")
        .gte("received_date", startDate.toISOString())
        .lte("received_date", endDate.toISOString())

      if (!receiptsError && receipts) {
        receipts.forEach((receipt: any) => {
          if (receipt.line_items_received && Array.isArray(receipt.line_items_received)) {
            const variantReceipt = receipt.line_items_received.find(
              (item: any) => item.variant_id === variantId
            )
            if (variantReceipt && variantReceipt.quantity) {
              unitsReceived += variantReceipt.quantity
            }
          }
        })
      }
    } catch (error) {
      // If inventory_receipts query fails, continue without it
      console.warn(`Could not fetch inventory receipts for variant ${variantId}:`, error)
    }

    // Calculate starting inventory approximation
    // starting_inventory = current_stock + units_sold - units_received
    const startingInventory = currentStock + unitsSold - unitsReceived

    if (startingInventory <= 0) {
      // If starting inventory was 0 or negative, we can't calculate meaningful sell-through
      return unitsSold > 0 ? 100 : 0 // If we sold something, it's 100% sell-through
    }

    const sellThroughRate = (unitsSold / startingInventory) * 100

    // Cap at 100% (can't sell more than you have)
    return Math.min(100, Math.max(0, sellThroughRate))
  } catch (error) {
    console.error(`Error calculating sell-through for variant ${variantId}:`, error)
    return null
  }
}
