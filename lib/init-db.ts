import { getSupabaseServerClient } from "@/lib/supabase"

export async function initializeDatabase() {
  try {
    console.log("Initializing database...")
    const supabase = getSupabaseServerClient()

    if (!supabase) {
      console.error("Failed to initialize Supabase client")
      return false
    }

    // Check if settings table exists using raw SQL query
    const { data: tableExistsResult, error: tableCheckError } = await supabase.rpc("execute_sql", {
      sql_query: `
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'settings'
        );
      `,
    })

    if (tableCheckError) {
      console.error("Error checking if settings table exists:", tableCheckError)
      return false
    }

    const settingsTableExists = tableExistsResult

    if (!settingsTableExists) {
      console.log("Settings table does not exist, creating it...")
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
        return false
      }
    }

    // Check if settings exist
    const { data: settings, error: settingsError } = await supabase
      .from("settings")
      .select("*")
      .in("key", ["store_name", "store_address", "store_phone", "store_email"])

    if (settingsError) {
      console.error("Error checking settings:", settingsError)
      return false
    }

    // Insert default settings if they don't exist
    const defaultSettings = [
      {
        key: "store_name",
        value: "VendaFlow POS",
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
        value: "Email: info@vendaflow.com",
        description: "Store email setting",
      },
    ]

    for (const setting of defaultSettings) {
      const exists = settings?.some((s) => s.key === setting.key)
      if (!exists) {
        console.log(`Inserting default setting: ${setting.key}`)
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

    // Check if customer_name column exists in sales table using raw SQL
    const { data: columnExistsResult, error: columnCheckError } = await supabase.rpc("execute_sql", {
      sql_query: `
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'sales' 
          AND column_name = 'customer_name'
        );
      `,
    })

    if (columnCheckError) {
      console.error("Error checking if customer_name column exists:", columnCheckError)
    } else if (!columnExistsResult) {
      console.log("customer_name column does not exist in sales table, adding it...")
      const { error: addColumnError } = await supabase.rpc("execute_sql", {
        sql_query: `ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name TEXT;`,
      })

      if (addColumnError) {
        console.error("Error adding customer_name column:", addColumnError)
      }
    }

    console.log("Database initialization completed successfully")
    return true
  } catch (error) {
    console.error("Error initializing database:", error)
    return false
  }
}
