// /src/lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

// Read from Vite env (adjust var names if yours differ)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create the client once
const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export both ways so all imports work:
export const supabase = client;   // named export
export default client;            // default export


