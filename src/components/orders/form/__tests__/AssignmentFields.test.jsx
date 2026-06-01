// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const isOrderNumberAvailableV2Mock = vi.hoisted(() => vi.fn());
const overrideOrderNumberMock = vi.hoisted(() => vi.fn());
const assignableUsersMock = vi.hoisted(() => ({
  listCompanyAssignableAppraisers: vi.fn(),
  listCompanyAssignableReviewers: vi.fn(),
}));

vi.mock("@/features/company-members/assignableUsersApi", () => assignableUsersMock);

vi.mock("@/lib/services/ordersService", () => ({
  isOrderNumberAvailableV2: isOrderNumberAvailableV2Mock,
  overrideOrderNumber: overrideOrderNumberMock,
}));

const { default: AssignmentFields } = await import("../AssignmentFields.jsx");

describe("AssignmentFields order number state", () => {
  let consoleErrorSpy;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    isOrderNumberAvailableV2Mock.mockReset();
    isOrderNumberAvailableV2Mock.mockResolvedValue(true);
    overrideOrderNumberMock.mockReset();
    overrideOrderNumberMock.mockResolvedValue({
      status: "updated",
      new_order_number: "2025124",
    });
    assignableUsersMock.listCompanyAssignableAppraisers.mockReset();
    assignableUsersMock.listCompanyAssignableReviewers.mockReset();
    assignableUsersMock.listCompanyAssignableAppraisers.mockResolvedValue([]);
    assignableUsersMock.listCompanyAssignableReviewers.mockResolvedValue([]);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    cleanup();
    vi.useRealTimers();
  });

  it("shows a generated-later order number state in create mode", async () => {
    render(<AssignmentFields value={{}} onChange={vi.fn()} isEdit={false} />);

    expect(screen.getByLabelText("Order number generated on save")).toHaveTextContent(
      "Generated on save",
    );
    expect(screen.getByText("Assigned automatically when saved.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Order #")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("No active appraisers found.")).toBeInTheDocument();
    });
  });

  it("keeps split percent, base fee, and appraiser fee editable", async () => {
    const onChange = vi.fn();

    render(
      <AssignmentFields
        value={{ split_pct: "", base_fee: "", appraiser_fee: "" }}
        onChange={onChange}
        isEdit={false}
      />,
    );

    fireEvent.change(screen.getByLabelText("Split %"), {
      target: { value: "42.5" },
    });
    fireEvent.change(screen.getByLabelText("Base Fee"), {
      target: { value: "1000" },
    });
    fireEvent.change(screen.getByLabelText("Appraiser Fee"), {
      target: { value: "425" },
    });

    expect(onChange).toHaveBeenCalledWith({ split_pct: "42.5" });
    expect(onChange).toHaveBeenCalledWith({ base_fee: "1000" });
    expect(onChange).toHaveBeenCalledWith({ appraiser_fee: "425" });

    await waitFor(() => {
      expect(screen.getByText("No active appraisers found.")).toBeInTheDocument();
    });
  });

  it("renders assignable operational user names with full_name before display_name", async () => {
    assignableUsersMock.listCompanyAssignableAppraisers.mockResolvedValue([
      {
        id: "user-kady",
        full_name: "Kady Weith",
        display_name: "Kady",
        email: "kady@example.test",
      },
    ]);
    assignableUsersMock.listCompanyAssignableReviewers.mockResolvedValue([]);

    render(<AssignmentFields value={{}} onChange={vi.fn()} isEdit={false} />);

    expect(await screen.findByRole("option", { name: "Kady Weith" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Kady" })).not.toBeInTheDocument();
  });

  it("shows the existing order number as read-only with an explicit override action in edit mode", () => {
    const onChange = vi.fn();

    render(
      <AssignmentFields
        value={{ order_number: "2025123" }}
        onChange={onChange}
        isEdit
        orderId="order-existing"
      />,
    );

    expect(screen.getByText("2025123")).toBeInTheDocument();
    expect(screen.getByText("Order-number changes require a separate override action.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change order number" })).toBeInTheDocument();
    expect(screen.queryByDisplayValue("2025123")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalledWith({ order_number: expect.any(String) });
  });

  it("opens the override shell with candidate and reason fields", () => {
    render(
      <AssignmentFields
        value={{ order_number: "2025123" }}
        onChange={vi.fn()}
        isEdit
        orderId="order-existing"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Change order number" }));

    expect(screen.getByRole("dialog", { name: "Change order number" })).toBeInTheDocument();
    expect(screen.getByLabelText("New order number")).toHaveValue("2025123");
    expect(screen.getByLabelText("Reason")).toHaveValue("");
    expect(screen.getByText("This action is separate from normal order edits and writes an order activity event when changed.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save order number" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("New order number"), {
      target: { value: "" },
    });
    expect(screen.getByRole("button", { name: "Save order number" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("New order number"), {
      target: { value: "2025124" },
    });
    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "Correction requested" },
    });

    expect(screen.getByLabelText("New order number")).toHaveValue("2025124");
    expect(screen.getByLabelText("Reason")).toHaveValue("Correction requested");
    expect(screen.getByRole("button", { name: "Save order number" })).toBeEnabled();
  });

  it("calls the explicit override service and updates local order-number state", async () => {
    const onChange = vi.fn();

    render(
      <AssignmentFields
        value={{ order_number: "2025123" }}
        onChange={onChange}
        isEdit
        orderId="order-existing"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Change order number" }));
    fireEvent.change(screen.getByLabelText("New order number"), {
      target: { value: "2025124" },
    });
    fireEvent.change(screen.getByLabelText("Reason"), {
      target: { value: "Correction requested" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save order number" }));

    await waitFor(() => {
      expect(overrideOrderNumberMock).toHaveBeenCalledWith(
        "order-existing",
        "2025124",
        "Correction requested",
      );
    });

    expect(onChange).toHaveBeenCalledWith({ order_number: "2025124" });
    expect(screen.queryByRole("dialog", { name: "Change order number" })).not.toBeInTheDocument();
  });

  it("renders a safe error when explicit override fails", async () => {
    overrideOrderNumberMock.mockRejectedValue(new Error("order_number_unavailable"));

    render(
      <AssignmentFields
        value={{ order_number: "2025123" }}
        onChange={vi.fn()}
        isEdit
        orderId="order-existing"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Change order number" }));
    fireEvent.change(screen.getByLabelText("New order number"), {
      target: { value: "2025124" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save order number" }));

    expect(await screen.findByText("That order number is not available for this company.")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Change order number" })).toBeInTheDocument();
  });
});
