// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import OrdersFilters from "../OrdersFilters";

vi.mock("@/features/company-members/assignableUsersApi", () => ({
  listCompanyAssignableAppraisers: vi.fn().mockResolvedValue([
    { id: "appraiser-1", full_name: "Avery Appraiser" },
  ]),
}));

vi.mock("@/features/orders/orderFilterOptionsApi", () => ({
  listOrderFilterClients: vi.fn().mockResolvedValue([
    { id: "client-1", name: "Acme Lending" },
  ]),
}));

describe("OrdersFilters", () => {
  afterEach(() => {
    cleanup();
  });

  it("preserves filter behavior while using shared interaction polish", async () => {
    const onChange = vi.fn();

    render(
      <OrdersFilters
        value={{
          search: "",
          statusIn: ["new"],
          clientId: "",
          appraiserId: "",
          priority: "",
          dueWindow: "",
          assignedToMe: false,
        }}
        onChange={onChange}
      />,
    );

    const search = screen.getByLabelText("Search orders");
    expect(search.className).toContain("focus-visible:ring-2");
    expect(search.style.getPropertyValue("--falcon-interaction-duration")).toBeTruthy();

    fireEvent.change(search, { target: { value: "123 Main" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ search: "123 Main", page: 0 }));

    const myWorkButton = screen.getByRole("button", { name: "My Work" });
    expect(myWorkButton.className).toContain("focus-visible:ring-2");
    fireEvent.click(myWorkButton);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        assignedToMe: true,
        appraiserId: "",
        reviewerId: "",
        page: 0,
      }),
    );

    const completedStatus = screen.getByRole("button", { name: "Completed" });
    expect(completedStatus.className).toContain("focus-visible:ring-2");
    fireEvent.click(completedStatus);
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ statusIn: ["completed"] }));

    await waitFor(() => expect(screen.getByRole("option", { name: "Acme Lending" })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("Client"), { target: { value: "client-1" } });
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ clientId: "client-1", page: 0 }));
  });
});
