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

function renderColumnCell(columnKey, order = {}) {
  const column = getColumnsForRole("owner").find((item) => item.key === columnKey);

  return {
    column,
    ...render(column.cell(order)),
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

  it("renders due-date timestamp aliases without local timezone day drift", () => {
    renderDatesCell({
      id: "order-1",
      site_visit_at: null,
      review_due_date: "2026-06-01T00:00:00+00",
      final_due_date: "2026-06-03T00:00:00+00",
    });

    expect(screen.getByText("6/1/2026")).toBeInTheDocument();
    expect(screen.getByText("6/3/2026")).toBeInTheDocument();
    expect(screen.queryByText("5/31/2026")).not.toBeInTheDocument();
    expect(screen.queryByText("6/2/2026")).not.toBeInTheDocument();
  });
});

describe("ordersColumns table hierarchy", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps the visible Orders columns while tuning scan hierarchy", () => {
    const columns = getColumnsForRole("owner");

    expect(columns.map((column) => column.key)).toEqual([
      "order",
      "client",
      "propertySummary",
      "fee",
      "actions",
      "dates",
    ]);
  });

  it("emphasizes primary scan targets and mutes supporting metadata", () => {
    const order = {
      id: "order-1",
      order_number: "2026001",
      client_name: "Acme Lending",
      appraiser_name: "Avery Appraiser",
      address_line1: "123 Main Street",
      city: "Denver",
      state: "CO",
      postal_code: "80202",
      property_type: "Retail",
      report_type: "Narrative",
      base_fee: 1450,
    };

    const { unmount: unmountClient } = renderColumnCell("client", order);
    expect(screen.getByText("Acme Lending").className).toContain("font-semibold");
    expect(screen.getByText("Avery Appraiser").className).toContain("text-slate-500");
    unmountClient();

    const { unmount: unmountProperty } = renderColumnCell("propertySummary", order);
    expect(screen.getByText("123 Main Street").className).toContain("text-slate-950");
    expect(screen.getByText("Denver, CO 80202").className).toContain("text-slate-500");
    expect(screen.getByText("Narrative").className).toContain("text-slate-400");
    unmountProperty();

    renderColumnCell("fee", order);
    expect(screen.getByText("$1,450").className).toContain("text-slate-600");
  });

  it("corrects the legacy Oofice property-type typo in visible chips", () => {
    renderColumnCell("propertySummary", {
      id: "order-1",
      address_line1: "123 Main Street",
      property_type: "Oofice",
      report_type: "Narrative",
    });

    expect(screen.getByText("Office")).toBeInTheDocument();
    expect(screen.queryByText("Oofice")).not.toBeInTheDocument();
  });
});
