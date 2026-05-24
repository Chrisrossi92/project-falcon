// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createOrderOperationalInputMock = vi.hoisted(() => vi.fn());
const clearOrderOperationalInputMock = vi.hoisted(() => vi.fn());
const toastSuccessMock = vi.hoisted(() => vi.fn());
const toastErrorMock = vi.hoisted(() => vi.fn());

vi.mock("../orderOperationalInputsApi", () => ({
  createOrderOperationalInput: createOrderOperationalInputMock,
  clearOrderOperationalInput: clearOrderOperationalInputMock,
}));

vi.mock("@/lib/hooks/useToast", () => ({
  useToast: () => ({
    success: toastSuccessMock,
    error: toastErrorMock,
  }),
}));

const { default: OperationalInputsCreateClearControls } = await import(
  "../OperationalInputsCreateClearControls"
);

describe("OperationalInputsCreateClearControls", () => {
  beforeEach(() => {
    createOrderOperationalInputMock.mockReset();
    clearOrderOperationalInputMock.mockReset();
    toastSuccessMock.mockReset();
    toastErrorMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("creates first-wave operational input evidence through the RPC helper", async () => {
    const onChanged = vi.fn().mockResolvedValue(undefined);
    createOrderOperationalInputMock.mockResolvedValue({ id: "input-1" });

    render(
      <OperationalInputsCreateClearControls
        orderId="order-1"
        inputs={[]}
        onChanged={onChanged}
      />,
    );

    const controls = screen.getByLabelText("Operational context controls");
    expect(within(controls).getByText("Adds temporary context. This does not change lifecycle status.")).toBeInTheDocument();

    fireEvent.click(within(controls).getByRole("button", { name: "Update context" }));
    fireEvent.click(screen.getByRole("button", { name: "Mark report on track" }));

    await waitFor(() => {
      expect(createOrderOperationalInputMock).toHaveBeenCalledWith("order-1", "report_on_track");
    });
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(toastSuccessMock).toHaveBeenCalledWith("Operational context updated.");
    expect(clearOrderOperationalInputMock).not.toHaveBeenCalled();
  });

  it("clears active operational input evidence through the RPC helper", async () => {
    const onChanged = vi.fn().mockResolvedValue(undefined);
    clearOrderOperationalInputMock.mockResolvedValue({ id: "input-1" });

    render(
      <OperationalInputsCreateClearControls
        orderId="order-1"
        inputs={[{ id: "input-1", input_type: "waiting_on_client" }]}
        onChanged={onChanged}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Update context" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: "Clear operational context: Waiting on client",
      }),
    );

    await waitFor(() => {
      expect(clearOrderOperationalInputMock).toHaveBeenCalledWith("input-1");
    });
    expect(onChanged).toHaveBeenCalledTimes(1);
    expect(toastSuccessMock).toHaveBeenCalledWith("Operational context updated.");
    expect(createOrderOperationalInputMock).not.toHaveBeenCalled();
  });

  it("hides unsupported active inputs and handles RPC denial without raw backend copy", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    createOrderOperationalInputMock.mockRejectedValue(new Error("order_operational_input_create_denied"));

    render(
      <OperationalInputsCreateClearControls
        orderId="order-1"
        inputs={[{ id: "input-unsafe", input_type: "inspection_complete" }]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Update context" }));
    expect(screen.queryByRole("button", { name: /inspection complete/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Mark waiting on client" }));

    const safeMessage = "Operational context could not be updated. No lifecycle changes were made.";
    await waitFor(() => {
      expect(screen.getByText(safeMessage)).toBeInTheDocument();
    });
    expect(toastErrorMock).toHaveBeenCalledWith(safeMessage);
    expect(screen.queryByText("order_operational_input_create_denied")).not.toBeInTheDocument();

    consoleError.mockRestore();
  });
});
