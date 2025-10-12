import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase"

export async function GET() {
  try {
    const supabase = getSupabaseServerClient()
    if (!supabase) {
      return NextResponse.json({ error: "Failed to initialize Supabase client" }, { status: 500 })
    }

    // Check if settings table exists
    const { data: tableExists, error: tableCheckError } = await supabase.rpc("check_table_exists", {
      table_name: "settings",
    })

    if (tableCheckError) {
      console.error("Error checking if settings table exists:", tableCheckError)
      return NextResponse.json({ error: tableCheckError.message }, { status: 500 })
    }

    if (!tableExists) {
      // Create settings table
      const { error: createTableError } = await supabase.rpc("execute_sql", {
        sql_query: `
          CREATE TABLE IF NOT EXISTS settings (
            id SERIAL PRIMARY KEY,
            key VARCHAR(255) NOT NULL UNIQUE,
            value TEXT,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `,
      })

      if (createTableError) {
        console.error("Error creating settings table:", createTableError)
        return NextResponse.json({ error: createTableError.message }, { status: 500 })
      }
    }

    // Check if settings exist
    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("*")
      .in("key", ["store_name", "store_address", "store_phone", "store_email"])

    if (settingsError) {
      console.error("Error checking settings:", settingsError)
      return NextResponse.json({ error: settingsError.message }, { status: 500 })
    }

    // Insert default settings if they don't exist
    const defaultSettings = [
      {
        key: "store_name",
        value: "VendoFlow POS",
        description: "Store name setting",
      },
      {
        key: "store_address",
        value: "123 Main Street, City, Country",
        description: "Store address setting",
      },
      {
        key: "store_phone",
        value: "Phone: +1 234 567 890",
        description: "Store phone setting",
      },
      {
        key: "store_email",
        value: "Email: info@vendoflow.com",
        description: "Store email setting",
      },
    ]

    for (const setting of defaultSettings) {
      const exists = settings?.some((s) => s.key === setting.key)
      if (!exists) {
        const { error: insertError } = await supabase.from("settings").insert({
          ...setting,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

        if (insertError) {
          console.error(`Error inserting default setting ${setting.key}:`, insertError)
        }
      }
    }

    return NextResponse.json({ success: true, message: "Database setup completed" })
  } catch (error) {
    console.error("Error in setup-db route:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
