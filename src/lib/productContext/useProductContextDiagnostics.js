import { useMemo } from "react";
import { useLocation } from "react-router-dom";

import { useOperationsMode } from "@/lib/operations/OperationsModeProvider";
import { getProductContextDiagnostics } from "@/lib/productContext/productContext";

export function useProductContextDiagnostics({ source = "route_runtime" } = {}) {
  const { pathname } = useLocation();
  const { operationsMode } = useOperationsMode();

  return useMemo(
    () =>
      getProductContextDiagnostics({
        pathname,
        operationsMode,
        source,
      }),
    [operationsMode, pathname, source],
  );
}

export default useProductContextDiagnostics;
