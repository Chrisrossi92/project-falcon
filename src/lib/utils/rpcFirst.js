// src/lib/utils/rpcFirst.js
/**
 * tryRpc():  must resolve to { data, error } (Supabase shape) or throw
 * fallback(): same shape; called whenever RPC is missing or errors
 */
export default async function rpcFirst(tryRpc, fallback) {
  const shouldFallback = (err) => {
    const code = err?.code ?? err?.status ?? err?.statusCode;
    const msg = (err?.message || "").toLowerCase();
    // Missing RPC / “schema cache” / not found / undefined function
    return (
      code === 404 ||
      code === "PGRST302" ||       // function not found
      code === "42883" ||          // undefined_function
      msg.includes("could not find the function") ||
      msg.includes("schema cache") ||
      msg.includes("not found") ||
      msg.includes("undefined function")
    );
  };

  try {
    const res = await tryRpc();
    if (res?.error) throw res.error;
    return res;
  } catch (err) {
    try {
      if (!shouldFallback(err)) throw err;  // hard error → bubble
      const fb = await fallback();
      // Prefer fallback result even if it returned an error object; at least we tried
      return fb;
    } catch (err2) {
      return { data: null, error: err2 };
    }
  }
}


