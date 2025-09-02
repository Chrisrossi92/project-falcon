// src/lib/hooks/useClients.js
import { useEffect, useMemo, useState } from "react";
import { listClients, getClientById } from "@/lib/services/clientsService";

export function useClients(opts = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const deps = useMemo(
    () => [opts.search || "", opts.status || ""],
    [opts.search, opts.status]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const rows = await listClients(opts);
        if (!cancelled) setData(rows);
      } catch (e) {
        if (!cancelled) {
          setData([]);
          setError(e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, deps);

  return { data, loading, error };
}

export function useClient(clientId) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!clientId);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!clientId) { setData(null); setLoading(false); setError(null); return; }
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const row = await getClientById(clientId);
        if (!cancelled) setData(row);
      } catch (e) {
        if (!cancelled) {
          setData(null);
          setError(e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [String(clientId || "")]);

  return { data, loading, error };
}
