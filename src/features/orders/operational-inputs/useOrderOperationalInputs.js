import { useCallback, useEffect, useRef, useState } from "react";
import { listActiveOrderOperationalInputs } from "./orderOperationalInputsApi";

export default function useOrderOperationalInputs(orderId) {
  const mountedRef = useRef(false);
  const [inputs, setInputs] = useState([]);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!orderId) {
      if (mountedRef.current) {
        setInputs([]);
        setLoading(false);
        setError(null);
      }
      return [];
    }

    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    try {
      const rows = await listActiveOrderOperationalInputs(orderId);
      if (mountedRef.current) setInputs(rows);
      return rows;
    } catch (err) {
      if (mountedRef.current) {
        setInputs([]);
        setError(err);
      }
      throw err;
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    mountedRef.current = true;
    refresh().catch(() => {});

    return () => {
      mountedRef.current = false;
    };
  }, [refresh]);

  return { inputs, loading, error, refresh };
}
