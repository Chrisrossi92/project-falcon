// scripts/reset-user-password.mjs
import { createClient } from "@supabase/supabase-js";

// 1) Read admin creds from env (never hardcode the service key)
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 2) Who are we resetting?
const TARGET_EMAIL = "mstout@continentalres.net";        // Mike
const NEW_PASSWORD = "Falcon123";                 // change after first login

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
  // Find the user by email (could also use a known user id)
  const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listErr) throw listErr;

  const user = list.users.find(u => (u.email || "").toLowerCase() === TARGET_EMAIL.toLowerCase());
  if (!user) throw new Error(`No Supabase user found for ${TARGET_EMAIL}`);

  // Set a new password directly (no email sent)
  const { data, error } = await admin.auth.admin.updateUserById(user.id, {
    password: NEW_PASSWORD,
  });
  if (error) throw error;

  console.log(`✅ Password reset for ${data.user.email} (id: ${data.user.id})`);
  console.log("Give Mike the temporary password and ask him to change it after login.");
}

run().catch(e => {
  console.error("❌ Failed:", e.message || e);
  process.exit(1);
});
