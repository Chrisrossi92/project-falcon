/* @vitest-environment jsdom */

import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  OperationsModeProvider,
  OPERATIONS_MODE_STORAGE_KEY,
  useOperationsMode,
} from "../OperationsModeProvider.jsx";
import { OPERATIONS_MODES } from "../operationsMode.js";

function OperationsModeProbe() {
  const {
    operationsMode,
    setOperationsMode,
    operationsModeLabel,
    isInternalOperations,
    isAmcOperations,
    availableOperationsModes,
  } = useOperationsMode();

  return (
    <div>
      <div data-testid="mode">{operationsMode}</div>
      <div data-testid="label">{operationsModeLabel}</div>
      <div data-testid="internal">{String(isInternalOperations)}</div>
      <div data-testid="amc">{String(isAmcOperations)}</div>
      <div data-testid="available">{availableOperationsModes.join(",")}</div>
      <button type="button" onClick={() => setOperationsMode(OPERATIONS_MODES.AMC_OPERATIONS)}>
        AMC
      </button>
      <button type="button" onClick={() => setOperationsMode("bad-mode")}>
        Invalid
      </button>
    </div>
  );
}

describe("OperationsModeProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("defaults to internal operations when no mode is stored", () => {
    render(
      <OperationsModeProvider>
        <OperationsModeProbe />
      </OperationsModeProvider>,
    );

    expect(screen.getByTestId("mode")).toHaveTextContent(OPERATIONS_MODES.INTERNAL_OPERATIONS);
    expect(screen.getByTestId("label")).toHaveTextContent("Internal Operations");
    expect(screen.getByTestId("internal")).toHaveTextContent("true");
    expect(screen.getByTestId("amc")).toHaveTextContent("false");
    expect(screen.getByTestId("available")).toHaveTextContent("internal_operations,amc_operations");
  });

  it("loads and exposes a valid stored mode", () => {
    window.localStorage.setItem(OPERATIONS_MODE_STORAGE_KEY, OPERATIONS_MODES.AMC_OPERATIONS);

    render(
      <OperationsModeProvider>
        <OperationsModeProbe />
      </OperationsModeProvider>,
    );

    expect(screen.getByTestId("mode")).toHaveTextContent(OPERATIONS_MODES.AMC_OPERATIONS);
    expect(screen.getByTestId("label")).toHaveTextContent("AMC Operations");
    expect(screen.getByTestId("internal")).toHaveTextContent("false");
    expect(screen.getByTestId("amc")).toHaveTextContent("true");
  });

  it("falls back when localStorage contains an invalid mode", () => {
    window.localStorage.setItem(OPERATIONS_MODE_STORAGE_KEY, "vendor_portal");

    render(
      <OperationsModeProvider>
        <OperationsModeProbe />
      </OperationsModeProvider>,
    );

    expect(screen.getByTestId("mode")).toHaveTextContent(OPERATIONS_MODES.INTERNAL_OPERATIONS);
    expect(screen.getByTestId("label")).toHaveTextContent("Internal Operations");
  });

  it("persists selected modes and normalizes invalid selections", () => {
    render(
      <OperationsModeProvider>
        <OperationsModeProbe />
      </OperationsModeProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "AMC" }));

    expect(screen.getByTestId("mode")).toHaveTextContent(OPERATIONS_MODES.AMC_OPERATIONS);
    expect(window.localStorage.getItem(OPERATIONS_MODE_STORAGE_KEY)).toBe(OPERATIONS_MODES.AMC_OPERATIONS);

    fireEvent.click(screen.getByRole("button", { name: "Invalid" }));

    expect(screen.getByTestId("mode")).toHaveTextContent(OPERATIONS_MODES.INTERNAL_OPERATIONS);
    expect(window.localStorage.getItem(OPERATIONS_MODE_STORAGE_KEY)).toBe(OPERATIONS_MODES.INTERNAL_OPERATIONS);
  });

  it("sanitizes available modes supplied by future entitlement logic", () => {
    render(
      <OperationsModeProvider availableOperationsModes={["bad-mode", OPERATIONS_MODES.AMC_OPERATIONS, OPERATIONS_MODES.AMC_OPERATIONS]}>
        <OperationsModeProbe />
      </OperationsModeProvider>,
    );

    expect(screen.getByTestId("available")).toHaveTextContent("amc_operations");
  });

  it("falls back to both modes when future entitlement logic supplies no valid modes", () => {
    render(
      <OperationsModeProvider availableOperationsModes={["bad-mode"]}>
        <OperationsModeProbe />
      </OperationsModeProvider>,
    );

    expect(screen.getByTestId("available")).toHaveTextContent("internal_operations,amc_operations");
  });

  it("handles localStorage read and write failures without changing access behavior", () => {
    const originalGetItem = window.Storage.prototype.getItem;
    const originalSetItem = window.Storage.prototype.setItem;

    window.Storage.prototype.getItem = () => {
      throw new Error("storage read unavailable");
    };
    window.Storage.prototype.setItem = () => {
      throw new Error("storage write unavailable");
    };

    try {
      render(
        <OperationsModeProvider>
          <OperationsModeProbe />
        </OperationsModeProvider>,
      );

      expect(screen.getByTestId("mode")).toHaveTextContent(OPERATIONS_MODES.INTERNAL_OPERATIONS);

      fireEvent.click(screen.getByRole("button", { name: "AMC" }));

      expect(screen.getByTestId("mode")).toHaveTextContent(OPERATIONS_MODES.AMC_OPERATIONS);
    } finally {
      window.Storage.prototype.getItem = originalGetItem;
      window.Storage.prototype.setItem = originalSetItem;
    }
  });
});
