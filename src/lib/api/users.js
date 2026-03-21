// src/lib/api/users.js
import supabase from '@/lib/supabaseClient';

// AnyObj type removed

/** Fetch profile + settings for one user (by id) */
export async function fetchMyProfileAndSettings(userId) {
  // Profiles are stored in the same "users" table in this codebase.
  const { data: u, error: uerr } = await supabase
    .from('users')
    .select('id, name, display_name, email, phone, avatar_url, preferences')
    .eq('id', userId)
    .single();
  if (uerr) throw uerr;

  // If you keep a separate settings table, join it here; otherwise preferences are in users.preferences
  return {
    id: u.id,
    name: u.name,
    display_name: u.display_name,
    email: u.email,
    phone: u.phone,
    avatar_url: u.avatar_url,
    preferences: u.preferences || {},
  };
}

/** Update basic profile fields */
export async function saveProfileBasic({ userId, name, email }) {
  // Canonical runtime path: update public.users directly.
  const { error } = await supabase
    .from('users')
    .update({ name: name ?? null, email: email ?? null })
    .eq('id', userId);
  if (error) throw error;
  return true;
}
