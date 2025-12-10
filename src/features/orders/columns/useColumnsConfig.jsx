// src/features/orders/columns/useColumnsConfig.jsx
import { useMemo } from "react";
import getColumnsForRole from "./ordersColumns";

export default function useColumnsConfig(role, actions = {}) {
  return useMemo(() => getColumnsForRole(role, actions), [role, actions]);
}
