// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  FalconEmptyState,
  FalconErrorState,
  FalconLoadingState,
  FalconSkeleton,
  FalconSuccessState,
  FalconUpdatingIndicator,
} from "../index";

function stubReducedMotion(matches) {
  const mediaQuery = {
    matches,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  };

  window.matchMedia = vi.fn().mockReturnValue(mediaQuery);

  return mediaQuery;
}

describe("Falcon state primitives", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders a layout-preserving skeleton with shape, dimensions, and className", () => {
    stubReducedMotion(false);

    render(
      <FalconSkeleton
        aria-label="Loading order row"
        className="custom-skeleton"
        height="2rem"
        shape="pill"
        width="12rem"
      />,
    );

    const skeleton = screen.getByRole("status", { name: "Loading order row" });
    expect(skeleton).toHaveAttribute("data-state-skeleton", "true");
    expect(skeleton).toHaveAttribute("data-motion-reduced", "false");
    expect(skeleton).toHaveClass("custom-skeleton", "rounded-full");
    expect(skeleton).toHaveStyle({ width: "12rem", height: "2rem" });
  });

  it("respects reduced motion for skeleton transition timing", () => {
    stubReducedMotion(true);

    render(<FalconSkeleton aria-label="Reduced skeleton" />);

    const skeleton = screen.getByRole("status", { name: "Reduced skeleton" });
    expect(skeleton).toHaveAttribute("data-motion-reduced", "true");
    expect(skeleton).toHaveStyle({ transitionDuration: "0ms" });
  });

  it("renders loading and updating states as calm status messages", () => {
    stubReducedMotion(false);

    render(
      <>
        <FalconLoadingState className="loading-shell" title="Loading orders">
          <FalconSkeleton aria-label="Loading table preview" />
        </FalconLoadingState>
        <FalconUpdatingIndicator className="saving-pill" label="Saving" />
      </>,
    );

    expect(screen.getByText("Loading orders").closest("[role='status']")).toHaveClass("loading-shell");
    expect(screen.getByRole("status", { name: "Loading table preview" })).toBeInTheDocument();
    expect(screen.getByText("Saving").closest("[role='status']")).toHaveClass("saving-pill");
  });

  it("renders empty state actions without treating the state as an error", () => {
    stubReducedMotion(false);

    render(
      <FalconEmptyState
        action={<button type="button">Create order</button>}
        className="empty-work"
        description="New work will appear here when it is ready."
        title="No active work"
      />,
    );

    expect(screen.getByText("No active work").closest("section")).not.toHaveAttribute("role");
    expect(screen.getByText("No active work").closest("section")).toHaveClass("empty-work");
    expect(screen.getByText("New work will appear here when it is ready.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create order" })).toBeInTheDocument();
  });

  it("renders recoverable errors and success confirmations with actions", () => {
    stubReducedMotion(false);

    render(
      <>
        <FalconErrorState
          action={<button type="button">Retry</button>}
          description="The list could not refresh."
          title="Refresh failed"
        />
        <FalconSuccessState
          action={<button type="button">View order</button>}
          description="The order was saved."
          title="Order saved"
        />
      </>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Refresh failed");
    expect(screen.getByRole("alert")).toHaveTextContent("The list could not refresh.");
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.getByText("Order saved").closest("[role='status']")).toHaveAttribute(
      "data-state-tone",
      "success",
    );
    expect(screen.getByRole("button", { name: "View order" })).toBeInTheDocument();
  });
});
