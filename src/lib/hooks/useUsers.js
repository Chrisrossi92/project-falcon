// src/lib/hooks/useUsers.js
import { useEffect, useMemo, useState } from "react";
import { listUsers, getUserByAuthId } from "@/lib/services/usersService";

export function useUsers(opts = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const deps = useMemo(
    () => [opts.search || "", opts.role || ""],
    [opts.search, opts.role]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const rows = await listUsers(opts);
        if (!cancelled) setData(rows);
      } catch (e) {
        if (!cancelled) { setData([]); setError(e); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, deps);

  return { data, loading, error };
}

export function useUserByAuthId(authId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!authId);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!authId) { setData(null); setLoading(false); setError(null); return; }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const row = await getUserByAuthId(authId);
        if (!cancelled) setData(row);
      } catch (e) {
        if (!cancelled) { setData(null); setError(e); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [String(authId || "")]);

  return { data, loading, error };
}
