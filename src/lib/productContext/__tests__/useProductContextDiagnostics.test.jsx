/* @vitest-environment jsdom */

import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PRODUCT_CONTEXTS } from "../productContext";
import { useProductContextDiagnostics } from "../useProductContextDiagnostics";

const operationsModeState = vi.hoisted(() => ({
  operationsMode: null,
}));

vi.mock("@/lib/operations/OperationsModeProvider", () => ({
  useOperationsMode: () => ({
    operationsMode: operationsModeState.operationsMode,
  }),
}));

function wrapperFor(pathname) {
  return function ProductContextDiagnosticsWrapper({ children }) {
    return <MemoryRouter initialEntries={[pathname]}>{children}</MemoryRouter>;
  };
}

describe("useProductContextDiagnostics", () => {
  beforeEach(() => {
    operationsModeState.operationsMode = null;
  });

  it("diagnoses /dashboard as shared legacy without operations mode", () => {
    const { result } = renderHook(() => useProductContextDiagnostics(), {
      wrapper: wrapperFor("/dashboard"),
    });

    expect(result.current.productContext).toBe(PRODUCT_CONTEXTS.SHARED_LEGACY);
    expect(result.current.pathname).toBe("/dashboard");
    expect(result.current.operationsModeProvided).toBe(false);
  });

  it("diagnoses /dashboard as AMC with AMC operations mode without granting authority", () => {
    operationsModeState.operationsMode = "amc_operations";

    const { result } = renderHook(() => useProductContextDiagnostics(), {
      wrapper: wrapperFor("/dashboard"),
    });

    expect(result.current.productContext).toBe(PRODUCT_CONTEXTS.AMC);
    expect(result.current.routeFamily).toBe("shared_legacy");
    expect(result.current.operationsMode).toBe("amc_operations");
    expect(result.current.affectsAuth).toBe(false);
    expect(result.current.affectsRouting).toBe(false);
    expect(result.current.affectsCompanyContext).toBe(false);
    expect(result.current.affectsDataAccess).toBe(false);
    expect(result.current.legalBoundary).toBe(false);
  });

  it("diagnoses vendor workspace routes as vendor", () => {
    operationsModeState.operationsMode = "internal_operations";

    const { result } = renderHook(() => useProductContextDiagnostics(), {
      wrapper: wrapperFor("/vendor-workspace/assigned-orders/work-key"),
    });

    expect(result.current.productContext).toBe(PRODUCT_CONTEXTS.VENDOR);
    expect(result.current.routeFamily).toBe("vendor");
    expect(result.current.diagnosticOnly).toBe(true);
  });

  it("reports diagnostics as non-authoritative controls", () => {
    operationsModeState.operationsMode = "amc_operations";

    const { result } = renderHook(() => useProductContextDiagnostics({ source: "unit_test" }), {
      wrapper: wrapperFor("/vendors"),
    });

    expect(result.current).toMatchObject({
      source: "unit_test",
      diagnosticOnly: true,
      affectsAuth: false,
      affectsRouting: false,
      affectsCompanyContext: false,
      affectsDataAccess: false,
      legalBoundary: false,
    });
  });
});
