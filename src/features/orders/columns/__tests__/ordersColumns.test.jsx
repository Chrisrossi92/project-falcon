// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import getColumnsForRole from "../ordersColumns";

function renderDatesCell(order, onSetSiteVisit = vi.fn()) {
  const datesColumn = getColumnsForRole("appraiser", { onSetSiteVisit }).find(
    (column) => column.key === "dates",
  );

  return {
    onSetSiteVisit,
    ...render(datesColumn.cell(order)),
  };
}

describe("ordersColumns date cell", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps the unset site visit control available", () => {
    renderDatesCell({
      id: "order-1",
      site_visit_at: null,
    });

    expect(screen.getByRole("button", { name: "Site: Not set" })).toBeInTheDocument();
  });

  it("renders an existing site visit as an editable picker trigger", async () => {
    const order = {
      id: "order-1",
      site_visit_at: "2026-05-20T14:30:00",
    };
    const { onSetSiteVisit } = renderDatesCell(order);

    const siteVisitTrigger = screen.getByRole("button", { name: "May 20, 2:30 PM" });
    expect(siteVisitTrigger).toHaveAttribute("title", expect.stringContaining("2026"));
    expect(siteVisitTrigger).not.toHaveTextContent("2026");

    fireEvent.click(siteVisitTrigger);

    expect(screen.getByRole("dialog", { name: "Site visit picker" })).toBeInTheDocument();
    expect(screen.getByLabelText("Site visit hour")).toHaveValue("2");
    expect(screen.getByLabelText("Site visit minutes")).toHaveValue("30");
    expect(screen.getByLabelText("Site visit meridiem")).toHaveValue("PM");

    fireEvent.change(screen.getByLabelText("Site visit hour"), { target: { value: "9" } });
    fireEvent.change(screen.getByLabelText("Site visit minutes"), { target: { value: "15" } });
    fireEvent.change(screen.getByLabelText("Site visit meridiem"), { target: { value: "AM" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSetSiteVisit).toHaveBeenCalledWith(order, "2026-05-20T09:15:00"));
  });
});
