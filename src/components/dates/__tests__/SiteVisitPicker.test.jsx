// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SiteVisitPicker from "../SiteVisitPicker";

describe("SiteVisitPicker", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("portals the picker above clipped table containers", () => {
    const { container } = render(
      <div data-testid="table-container" className="overflow-hidden">
        <SiteVisitPicker value={null} onChange={vi.fn()} emptyLabel="Site: Not set" />
      </div>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Site: Not set" }));

    const picker = screen.getByRole("dialog", { name: "Site visit picker" });
    const clippedContainer = screen.getByTestId("table-container");

    expect(picker).toBeInTheDocument();
    expect(clippedContainer).not.toContainElement(picker);
    expect(picker).toHaveClass("w-[240px]");
    expect(picker).toHaveStyle({ position: "fixed" });
    expect(container).toContainElement(clippedContainer);
  });

  it("uses compact hour, minute, and meridiem dropdowns when saving", () => {
    const onChange = vi.fn();
    render(
      <SiteVisitPicker
        value="2026-05-20T14:00:00"
        onChange={onChange}
        emptyLabel="Site: Not set"
      />,
    );

    fireEvent.click(screen.getByRole("button"));

    const hour = screen.getByLabelText("Site visit hour");
    const minutes = screen.getByLabelText("Site visit minutes");
    const meridiem = screen.getByLabelText("Site visit meridiem");

    expect(within(hour).getAllByRole("option")).toHaveLength(12);
    expect(within(minutes).getAllByRole("option").map((option) => option.value)).toEqual([
      "00",
      "15",
      "30",
      "45",
    ]);
    expect(within(meridiem).getAllByRole("option").map((option) => option.value)).toEqual([
      "AM",
      "PM",
    ]);

    fireEvent.change(hour, { target: { value: "9" } });
    fireEvent.change(minutes, { target: { value: "15" } });
    fireEvent.change(meridiem, { target: { value: "AM" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(onChange).toHaveBeenCalledWith("2026-05-20T09:15:00");
  });

  it("reopens with an existing site visit time preloaded", () => {
    render(
      <SiteVisitPicker
        value="2026-05-20T14:30:00"
        onChange={vi.fn()}
        triggerVariant="ghost"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /2026|May/i }));

    expect(screen.getByLabelText("Site visit hour")).toHaveValue("2");
    expect(screen.getByLabelText("Site visit minutes")).toHaveValue("30");
    expect(screen.getByLabelText("Site visit meridiem")).toHaveValue("PM");
  });

  it("can render a compact trigger label while preserving the full date title", () => {
    render(
      <SiteVisitPicker
        value="2026-05-20T14:30:00"
        onChange={vi.fn()}
        displayFormatter={(date) =>
          date.toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
      />,
    );

    const trigger = screen.getByRole("button", { name: "May 20, 2:30 PM" });
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveAttribute("title", expect.stringContaining("2026"));
  });

  it("keeps the calendar header compact without showing the year", () => {
    render(
      <SiteVisitPicker
        value="2026-05-20T14:30:00"
        onChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /2026|May/i }));

    const picker = screen.getByRole("dialog", { name: "Site visit picker" });
    expect(within(picker).getByRole("button", { name: "May" })).toBeInTheDocument();
    expect(within(picker).queryByText(/2026/)).not.toBeInTheDocument();
  });

  it("clamps the picker left position near the right viewport edge", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 800,
    });
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      writable: true,
      value: 900,
    });

    vi.spyOn(window.HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      x: 760,
      y: 100,
      left: 760,
      right: 820,
      top: 100,
      bottom: 132,
      width: 60,
      height: 32,
      toJSON: () => {},
    });

    render(<SiteVisitPicker value={null} onChange={vi.fn()} emptyLabel="Site: Not set" />);

    fireEvent.click(screen.getByRole("button", { name: "Site: Not set" }));

    const picker = screen.getByRole("dialog", { name: "Site visit picker" });
    await waitFor(() => {
      expect(picker).toHaveStyle({ left: "544px" });
    });
  });
});
