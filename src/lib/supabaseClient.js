// src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const url  = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY; // BROWSER = ANON ONLY

// HMR-safe singleton to prevent multiple GoTrue instances
const client =
  globalThis.__falcon_supabase__ ||
  createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
    },
  });

if (!globalThis.__falcon_supabase__) {
  globalThis.__falcon_supabase__ = client;
}

export default client;



