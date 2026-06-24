// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const navigateMock = vi.hoisted(() => vi.fn());
const successMock = vi.hoisted(() => vi.fn());
const orderFormMock = vi.hoisted(() => vi.fn());

vi.mock("react-router-dom", () => ({
  useNavigate: () => navigateMock,
}));

vi.mock("@/lib/hooks/useToast", () => ({
  useToast: () => ({
    success: successMock,
  }),
}));

vi.mock("@/components/orders/form/OrderForm", () => ({
  default: (props) => {
    orderFormMock(props);
    return (
      <div>
        <div data-testid="operations-scope">{props.operationsScope || ""}</div>
        <div data-testid="inline-client-creation">
          {String(props.allowInlineClientCreation)}
        </div>
        <button type="button" onClick={() => props.onSaved?.({ id: "order-123" })}>
          Save mocked order
        </button>
      </div>
    );
  },
}));

const { default: AmcNewOrderPage } = await import("../AmcNewOrderPage.jsx");
const { default: NewOrderPage } = await import("../../NewOrder.jsx");

const routesSource = readFileSync(resolve(process.cwd(), "src/routes/index.jsx"), "utf8");

describe("AmcNewOrderPage", () => {
  beforeEach(() => {
    navigateMock.mockReset();
    successMock.mockReset();
    orderFormMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders OrderForm in AMC existing-client-only mode", () => {
    render(<AmcNewOrderPage />);

    expect(orderFormMock).toHaveBeenCalledWith(
      expect.objectContaining({
        operationsScope: "amc_operations",
        allowInlineClientCreation: false,
      }),
    );
    expect(screen.getByTestId("operations-scope")).toHaveTextContent("amc_operations");
    expect(screen.getByTestId("inline-client-creation")).toHaveTextContent("false");
  });

  it("uses AMC-local detail navigation after a future successful create", () => {
    render(<AmcNewOrderPage />);

    fireEvent.click(screen.getByRole("button", { name: "Save mocked order" }));

    expect(successMock).toHaveBeenCalledWith("Order created");
    expect(navigateMock).toHaveBeenCalledWith("/amc/orders/order-123");
  });

  it("keeps the compatibility Internal create page unchanged", () => {
    render(<NewOrderPage />);

    expect(orderFormMock).toHaveBeenCalledWith(
      expect.not.objectContaining({
        operationsScope: expect.anything(),
        allowInlineClientCreation: expect.anything(),
      }),
    );
  });

  it("registers the AMC create route alias through the AMC create wrapper", () => {
    expect(routesSource).toContain('path="/amc/orders/new"');
    expect(routesSource).toContain("AmcNewOrderPage");
  });
});
