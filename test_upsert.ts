import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testUpsert() {
  const { data, error } = await supabaseAdmin
      .schema("vendo_admin")
      .from("settings")
      .upsert({ 
        key: "report_schedule_daily", 
        value: { enabled: true },
        updated_by: "584f390c-458e-492a-8a15-3ce0fe46b53c", // Momo's UUID
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' })
      .select()

  console.log("Error:", error)
  console.log("Data:", data)
}

testUpsert()
