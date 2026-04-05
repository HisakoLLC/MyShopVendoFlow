import { createClient } from "@supabase/supabase-js"
import dotenv from "dotenv"

dotenv.config({ path: ".env.local" })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testFetch() {
  const { data, error } = await supabaseAdmin
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
      .limit(1)

  console.log("Error:", error)
  console.log("Data:", JSON.stringify(data, null, 2))
}

testFetch()
