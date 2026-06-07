import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import {
  DEFAULT_OPERATIONS_MODE,
  getAvailableOperationsModes,
  getOperationsModeLabel,
  isValidOperationsMode,
  normalizeOperationsMode,
  OPERATIONS_MODES,
} from "./operationsMode.js";

export const OPERATIONS_MODE_STORAGE_KEY = "falcon.operationsMode";

const OperationsModeContext = createContext(null);
const DEFAULT_AVAILABLE_OPERATIONS_MODES = getAvailableOperationsModes();

function getLocalStorage() {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function readStoredOperationsMode() {
  const storage = getLocalStorage();
  if (!storage) return DEFAULT_OPERATIONS_MODE;

  try {
    return normalizeOperationsMode(storage.getItem(OPERATIONS_MODE_STORAGE_KEY));
  } catch {
    return DEFAULT_OPERATIONS_MODE;
  }
}

function persistOperationsMode(mode) {
  const storage = getLocalStorage();
  if (!storage) return;

  try {
    storage.setItem(OPERATIONS_MODE_STORAGE_KEY, mode);
  } catch {
    // localStorage may be unavailable in private or restricted browser contexts.
  }
}

function normalizeAvailableOperationsModes(availableOperationsModes) {
  const suppliedModes = Array.isArray(availableOperationsModes)
    ? availableOperationsModes.filter(isValidOperationsMode)
    : DEFAULT_AVAILABLE_OPERATIONS_MODES;
  const uniqueModes = [...new Set(suppliedModes)].filter(isValidOperationsMode);

  return Object.freeze(
    uniqueModes.length ? uniqueModes : [OPERATIONS_MODES.INTERNAL_OPERATIONS],
  );
}

function coerceOperationsModeForAvailability(mode, availableOperationsModes) {
  const normalizedMode = normalizeOperationsMode(mode);
  return availableOperationsModes.includes(normalizedMode)
    ? normalizedMode
    : availableOperationsModes[0] ?? DEFAULT_OPERATIONS_MODE;
}

export function OperationsModeProvider({ children, availableOperationsModes = DEFAULT_AVAILABLE_OPERATIONS_MODES }) {
  const normalizedAvailableOperationsModes = useMemo(
    () => normalizeAvailableOperationsModes(availableOperationsModes),
    [availableOperationsModes],
  );
  const [operationsMode, setOperationsModeState] = useState(() =>
    coerceOperationsModeForAvailability(readStoredOperationsMode(), normalizedAvailableOperationsModes)
  );

  const setOperationsMode = useCallback((mode) => {
    const nextMode = coerceOperationsModeForAvailability(mode, normalizedAvailableOperationsModes);
    setOperationsModeState(nextMode);
    persistOperationsMode(nextMode);
  }, [normalizedAvailableOperationsModes]);

  useEffect(() => {
    setOperationsModeState((currentMode) => {
      const nextMode = coerceOperationsModeForAvailability(currentMode, normalizedAvailableOperationsModes);
      if (nextMode !== currentMode) {
        persistOperationsMode(nextMode);
      }
      return nextMode;
    });
  }, [normalizedAvailableOperationsModes]);

  const value = useMemo(() => ({
    operationsMode,
    setOperationsMode,
    operationsModeLabel: getOperationsModeLabel(operationsMode),
    isInternalOperations: operationsMode === OPERATIONS_MODES.INTERNAL_OPERATIONS,
    isAmcOperations: operationsMode === OPERATIONS_MODES.AMC_OPERATIONS,
    availableOperationsModes: normalizedAvailableOperationsModes,
  }), [normalizedAvailableOperationsModes, operationsMode, setOperationsMode]);

  return (
    <OperationsModeContext.Provider value={value}>
      {children}
    </OperationsModeContext.Provider>
  );
}

export function useOperationsMode() {
  const context = useContext(OperationsModeContext);

  if (!context) {
    throw new Error("useOperationsMode must be used within <OperationsModeProvider>");
  }

  return context;
}
