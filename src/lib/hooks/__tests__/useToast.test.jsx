// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider, useToast } from "../useToast";

function ToastHarness() {
  const toast = useToast();

  return (
    <div>
      <button type="button" onClick={() => toast.success("Saved without changing workflow.")}>
        Success
      </button>
      <button type="button" onClick={() => toast.error("No changes were made.")}>
        Error
      </button>
    </div>
  );
}

describe("ToastProvider", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders success acknowledgments with the restrained operational shell", async () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Success" }));

    const toast = screen.getByRole("status");
    expect(toast).toHaveTextContent("Success");
    expect(toast).toHaveTextContent("Saved without changing workflow.");
    expect(toast).toHaveClass("rounded-xl", "shadow-xl", "animate-in", "motion-reduce:animate-none");
  });

  it("renders errors as alert acknowledgments", async () => {
    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Error" }));

    const toast = screen.getByRole("alert");
    expect(toast).toHaveTextContent("Error");
    expect(toast).toHaveTextContent("No changes were made.");
    expect(toast).toHaveClass("border-rose-200");
  });

  it("keeps the existing default dismissal timing", async () => {
    vi.useFakeTimers();

    render(
      <ToastProvider>
        <ToastHarness />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Success" }));
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3499);
    });
    expect(screen.getByRole("status")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
