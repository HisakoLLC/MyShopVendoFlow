import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

async function testMining() {
    console.log("STARTING DATA MINING TEST...")
    const merchantId = "cffeec54-db3e-4363-b8a7-7be696cd86b2" // Faroumy Apparel from typical logs
    const startDate = "2026-03-01"
    const endDate = "2026-03-31"
    
    try {
        console.log("Querying sales...")
        const { data: sales, error: salesError } = await supabaseAdmin
        .schema("public")
        .from("sales")
        .select(`
          sale_id,
          grand_total,
          payment_method,
          store_id,
          sale_line_items!sale_line_items_sale_id_fkey (
            quantity,
            line_total,
            variant_id,
            product_variants (
              product_styles (
                name
              )
            )
          )
        `)
        .eq("account_id", merchantId)
        .gte("sale_date", startDate)
        .lte("sale_date", endDate)
        
        if (salesError) {
            console.error("SALES FETCH ERROR:", salesError)
            return
        }
        
        console.log(`Found ${sales?.length} sales`)
        console.log("Sales data preview:", JSON.stringify(sales?.[0], null, 2))
        
    } catch(err) {
        console.error("FATAL ERROR:", err)
    }
}

testMining()
