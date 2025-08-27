// scripts/check-tables.mjs
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.log("ℹ️  SUPABASE_URL / SUPABASE_ANON_KEY not set — skipping DB checks.");
  process.exit(0);
}

const supabase = createClient(url, key);
const tables = ["orders", "order_activity", "notifications", "clients", "users"];

let fail = false;
for (const t of tables) {
  try {
    const { error } = await supabase.from(t).select("id").limit(1);
    if (error) throw error;
    console.log(`✅ ${t} OK`);
  } catch (e) {
    console.error(`❌ ${t} check failed:`, e.message || e);
    fail = true;
  }
}
if (fail) process.exit(1);


