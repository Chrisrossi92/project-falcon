import { useEffect, useState } from "react";
import { listActiveOrderOperationalInputs } from "./orderOperationalInputsApi";

export default function useOrderOperationalInputs(orderId) {
  const [inputs, setInputs] = useState([]);
  const [loading, setLoading] = useState(Boolean(orderId));
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    if (!orderId) {
      setInputs([]);
      setLoading(false);
      setError(null);
      return () => {
        mounted = false;
      };
    }

    setLoading(true);
    setError(null);

    listActiveOrderOperationalInputs(orderId)
      .then((rows) => {
        if (!mounted) return;
        setInputs(rows);
      })
      .catch((err) => {
        if (!mounted) return;
        setInputs([]);
        setError(err);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [orderId]);

  return { inputs, loading, error };
}
