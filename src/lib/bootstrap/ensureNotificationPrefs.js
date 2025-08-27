// src/lib/bootstrap/ensureNotificationPrefs.js
import { getNotificationPrefs } from "@/features/notifications/api";
import supabase from "@/lib/supabaseClient";

/**
 * Ensures a prefs row exists for the current user.
 * DB trigger should handle new users; this is a safe client fallback.
 */
export async function ensureNotificationPrefs() {
  try {
    // Try to read; if present, nothing to do
    const prefs = await getNotificationPrefs();
    if (prefs && prefs.user_id) return;

    // Otherwise, ask the DB to ensure it
    await supabase.rpc("rpc_notification_prefs_ensure");
  } catch {
    // Non-fatal; UI can still run
  }
}
