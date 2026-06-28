// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import EventChip from "../EventChip";

describe("EventChip", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps event type separate from the compact property label", () => {
    render(
      <EventChip
        event={{
          type: "review",
          orderNumber: "26001",
          address: "100 Main St",
          clientName: "Acme Lending",
          appraiserName: "Ava Appraiser",
          start: "2099-05-22T10:00:00",
        }}
        role="owner"
      />,
    );

    const chip = screen.getByRole("button");
    expect(within(chip).getByText("Review")).toBeInTheDocument();
    expect(within(chip).getByText("100 Main St")).toBeInTheDocument();
    expect(within(chip).getByText("Ava A. · Acme Lending")).toBeInTheDocument();
    expect(screen.queryByText("Review due")).not.toBeInTheDocument();
  });

  it("preserves late markers without changing event click behavior", () => {
    const onClick = vi.fn();

    render(
      <EventChip
        event={{
          type: "due_to_client",
          orderId: "order-1",
          orderNumber: "26002",
          address: "200 Final Ave",
          start: "2020-01-01T10:00:00",
        }}
        onClick={onClick}
      />,
    );

    const chip = screen.getByRole("button");
    expect(within(chip).getByText("Final")).toBeInTheDocument();
    expect(within(chip).getByText("Late")).toBeInTheDocument();
    expect(within(chip).getByText("200 Final Ave")).toBeInTheDocument();

    fireEvent.click(chip);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("contains long hover text inside a wrapping tooltip", () => {
    const { container } = render(
      <EventChip
        event={{
          type: "site",
          orderId: "order-1",
          orderNumber: "26003",
          address: "12345 Very Long Property Name With Suite Details And Extended Location Context",
          clientName: "Long Client Name Lending Group",
          appraiserName: "Avery Longlastname",
          start: "2099-05-22T10:00:00",
        }}
        role="owner"
      />,
    );

    const tooltip = container.querySelector("[aria-hidden='true']");
    expect(tooltip).toHaveClass("max-w-[20rem]");
    expect(tooltip).toHaveClass("bg-slate-950");

    const tooltipText = tooltip.querySelector(".whitespace-normal.break-words");
    expect(tooltipText).toBeInTheDocument();
  });
});
