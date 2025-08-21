// src/lib/api/users.ts
import supabase from '@/lib/supabaseClient';

type AnyObj = Record<string, any>;

function isMissingRpc(e: any) {
  const code = String(e?.code || '').trim();
  const msg  = String(e?.message || '').toLowerCase();
  return code === '42883' || code === '404' || (msg.includes('function') && msg.includes('does not exist'));
}

/** Fetch profile + settings for one user (by id) */
export async function fetchMyProfileAndSettings(userId: string): Promise<AnyObj> {
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

/** Update basic profile fields (RPC-first) */
export async function saveProfileBasic({ userId, name, email }: { userId: string; name?: string; email?: string; }) {
  // Try RPC if present
  const { error: rpcErr } = await supabase.rpc('rpc_update_profile', {
    p_user_id: userId,
    p_display_name: null,
    p_color: null,
    p_phone: null,
    p_avatar_url: null,
    p_name: name ?? null,
    p_email: email ?? null,
  });

  if (rpcErr) {
    if (isMissingRpc(rpcErr)) {
      const { error } = await supabase
        .from('users')
        .update({ name: name ?? null, email: email ?? null })
        .eq('id', userId);
      if (error) throw error;
    } else {
      throw rpcErr;
    }
  }
  return true;
}

/** Update preferences/settings (RPC-first) */
export async function saveSettings({ userId, phone, preferences }: { userId: string; phone?: string; preferences?: AnyObj; }) {
  // Try RPC if present
  const { error: rpcErr } = await supabase.rpc('rpc_update_profile', {
    p_user_id: userId,
    p_display_name: null,
    p_color: null,
    p_phone: phone ?? null,
    p_avatar_url: null,
    p_name: null,
    p_email: null,
    p_preferences: preferences ?? null,
  });

  if (rpcErr) {
    if (isMissingRpc(rpcErr)) {
      const patch: AnyObj = {};
      if (typeof phone !== 'undefined') patch.phone = phone;
      if (typeof preferences !== 'undefined') patch.preferences = preferences;

      const { error } = await supabase
        .from('users')
        .update(patch)
        .eq('id', userId);
      if (error) throw error;
    } else {
      throw rpcErr;
    }
  }
  return true;
}


