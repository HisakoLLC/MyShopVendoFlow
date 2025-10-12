import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase"

export async function GET() {
  try {
    console.log("API: Starting database initialization...")
    const supabase = getSupabaseServerClient()

    if (!supabase) {
      console.error("API: Failed to initialize Supabase client")
      return NextResponse.json({ success: false, error: "Failed to initialize database client" }, { status: 500 })
    }

    // 1. Create settings table if it doesn't exist
    console.log("API: Creating settings table if it doesn't exist...")
    try {
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
        console.error("API: Error creating settings table:", createTableError)
        return NextResponse.json(
          { success: false, error: `Error creating settings table: ${createTableError.message}` },
          { status: 500 },
        )
      }
    } catch (error) {
      console.error("API: Exception creating settings table:", error)
      return NextResponse.json(
        {
          success: false,
          error: `Exception creating settings table: ${error instanceof Error ? error.message : String(error)}`,
        },
        { status: 500 },
      )
    }

    // 2. Insert default settings directly with SQL to avoid permission issues
    console.log("API: Inserting default settings...")
    try {
      const { error: insertError } = await supabase.rpc("execute_sql", {
        sql_query: `
          INSERT INTO settings (key, value, description, created_at, updated_at)
          VALUES 
          ('store_name', 'VendoFlow POS', 'Store name setting', NOW(), NOW()),
          ('store_address', '123 Main Street, City, Country', 'Store address setting', NOW(), NOW()),
          ('store_phone', 'Phone: +1 234 567 890', 'Store phone setting', NOW(), NOW()),
          ('store_email', 'Email: info@vendoflow.com', 'Store email setting', NOW(), NOW())
          ON CONFLICT (key) DO NOTHING;
        `,
      })

      if (insertError) {
        console.error("API: Error inserting default settings:", insertError)
        return NextResponse.json(
          { success: false, error: `Error inserting default settings: ${insertError.message}` },
          { status: 500 },
        )
      }
    } catch (error) {
      console.error("API: Exception inserting default settings:", error)
      return NextResponse.json(
        {
          success: false,
          error: `Exception inserting default settings: ${error instanceof Error ? error.message : String(error)}`,
        },
        { status: 500 },
      )
    }

    // 3. Add customer_name column to sales table if it doesn't exist
    console.log("API: Adding customer_name column to sales table if needed...")
    try {
      const { error: alterTableError } = await supabase.rpc("execute_sql", {
        sql_query: `
          DO $$ BEGIN IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sales' AND column_name = 'customer_name') THEN ALTER TABLE sales ADD COLUMN customer_name TEXT; END IF; END $$;
        `,
      })

      if (alterTableError) {
        console.error("API: Error adding customer_name column:", alterTableError)
        return NextResponse.json(
          { success: false, error: `Error adding customer_name column: ${alterTableError.message}` },
          { status: 500 },
        )
      }
    } catch (error) {
      console.error("API: Exception adding customer_name column:", error)
      return NextResponse.json(
        {
          success: false,
          error: `Exception adding customer_name column: ${error instanceof Error ? error.message : String(error)}`,
        },
        { status: 500 },
      )
    }

    console.log("API: Database initialization completed successfully")
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API: Unhandled error in init-db route:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
