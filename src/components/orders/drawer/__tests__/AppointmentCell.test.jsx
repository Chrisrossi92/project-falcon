// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import AppointmentCell from "../AppointmentCell";

describe("AppointmentCell", () => {
  afterEach(() => {
    cleanup();
  });

  it("displays and saves site visits as local wall time", () => {
    const onSetAppointment = vi.fn();
    render(
      <AppointmentCell
        siteVisitAt="2026-06-02T11:00:00+00:00"
        onSetAppointment={onSetAppointment}
      />,
    );

    expect(screen.getByText("Jun 2, 2026 • 11:00 AM")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Edit appointment" }));
    fireEvent.click(screen.getByRole("button", { name: /Update Appointment/ }));

    expect(onSetAppointment).toHaveBeenCalledWith("2026-06-02T11:00:00");
  });
});
