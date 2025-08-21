// src/lib/utils/rpcFirst.js
import supabase from '@/lib/supabaseClient';

/**
 * Call an RPC; on "function does not exist" (42883) or 404, run a fallback.
 * @param {string} fn       RPC name
 * @param {object} params   RPC parameters
 * @param {() => Promise<any>} fallback  async fallback to run if RPC missing
 * @returns {Promise<any>}
 */
export async function rpcFirst(fn, params, fallback) {
  const { data, error } = await supabase.rpc(fn, params);
  if (!error) return data;

  const code = String(error.code || '').trim();
  const msg  = String(error.message || '').toLowerCase();

  // Missing RPC → fall back (still throw other errors)
  if (code === '42883' || code === '404' || (msg.includes('function') && msg.includes('does not exist'))) {
    if (typeof fallback === 'function') return fallback();
  }
  throw error;
}

export default rpcFirst;

