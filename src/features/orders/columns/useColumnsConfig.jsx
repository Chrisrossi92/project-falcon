// src/features/orders/columns/useColumnsConfig.jsx
import { useMemo } from "react";
import getColumnsForRole from "./ordersColumns";

export default function useColumnsConfig(role, actions = {}, options = {}) {
  return useMemo(
    () => getColumnsForRole(role, actions, options),
    [role, actions, options.variant]
  );
}
