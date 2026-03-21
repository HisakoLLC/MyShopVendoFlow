const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "YOUR_URL";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "YOUR_KEY";
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data: po, error: poErr } = await supabase.from('purchase_orders').select('*').limit(1);
  console.log("Purchase Orders Columns:", po ? Object.keys(po[0] || {}) : "No data", "Error:", poErr?.message);

  const { data: sup, error: supErr } = await supabase.from('suppliers').select('*').limit(1);
  console.log("Suppliers Columns:", sup ? Object.keys(sup[0] || {}) : "No data", "Error:", supErr?.message);
}

checkSchema();
