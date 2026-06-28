// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const orderClientOptionsMock = vi.hoisted(() => ({
  listOrderFormClientOptions: vi.fn(),
  searchOrderFormClientsByName: vi.fn(),
}));

vi.mock("@/features/orders/orderClientOptionsApi", () => orderClientOptionsMock);

const { default: ClientFields } = await import("../ClientFields.jsx");

function StatefulClientFields(props) {
  const [value, setValue] = useState({});
  return (
    <ClientFields
      {...props}
      value={value}
      onChange={(patch) => setValue((current) => ({ ...current, ...patch }))}
    />
  );
}

describe("ClientFields", () => {
  beforeEach(() => {
    orderClientOptionsMock.listOrderFormClientOptions.mockReset();
    orderClientOptionsMock.searchOrderFormClientsByName.mockReset();
    orderClientOptionsMock.listOrderFormClientOptions.mockResolvedValue([
      { id: "client-1", name: "AMC Client", category: "client" },
    ]);
    orderClientOptionsMock.searchOrderFormClientsByName.mockResolvedValue([]);
  });

  afterEach(() => {
    cleanup();
  });

  it("loads client options without scope by default", async () => {
    render(<ClientFields value={{}} onChange={vi.fn()} />);

    await waitFor(() => {
      expect(orderClientOptionsMock.listOrderFormClientOptions).toHaveBeenCalledWith();
    });
  });

  it("loads client options with explicit operations scope", async () => {
    render(<ClientFields value={{}} onChange={vi.fn()} operationsScope="amc_operations" />);

    await waitFor(() => {
      expect(orderClientOptionsMock.listOrderFormClientOptions).toHaveBeenCalledWith({
        operationsScope: "amc_operations",
      });
    });
  });

  it("uses scoped duplicate search when manual client entry is available", async () => {
    render(<StatefulClientFields operationsScope="amc_operations" />);

    fireEvent.change(screen.getByPlaceholderText("Manual client name"), {
      target: { value: "Scoped Client" },
    });

    await waitFor(() => {
      expect(orderClientOptionsMock.searchOrderFormClientsByName).toHaveBeenCalledWith(
        "Scoped Client",
        { limit: 10, operationsScope: "amc_operations" },
      );
    });
  });

  it("does not run duplicate search when inline client creation is disabled", async () => {
    render(
      <ClientFields
        value={{}}
        onChange={vi.fn()}
        operationsScope="amc_operations"
        allowInlineClientCreation={false}
      />,
    );

    expect(screen.queryByPlaceholderText("Manual client name")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(orderClientOptionsMock.listOrderFormClientOptions).toHaveBeenCalled();
    });
    expect(orderClientOptionsMock.searchOrderFormClientsByName).not.toHaveBeenCalled();
  });
});
