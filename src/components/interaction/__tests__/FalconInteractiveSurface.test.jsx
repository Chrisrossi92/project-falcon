// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FalconInteractiveSurface } from "../index";

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

describe("FalconInteractiveSurface", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("passes through className, children, and click handlers", () => {
    stubReducedMotion(false);
    const onClick = vi.fn();

    render(
      <FalconInteractiveSurface
        as="button"
        type="button"
        className="custom-surface"
        onClick={onClick}
      >
        Open order
      </FalconInteractiveSurface>,
    );

    const surface = screen.getByRole("button", { name: "Open order" });
    expect(surface).toHaveClass("custom-surface", "cursor-pointer", "focus-visible:ring-2");
    expect(surface).toHaveStyle({
      "--falcon-interaction-duration": "140ms",
      "--falcon-interaction-hover-lift": "-1px",
    });

    fireEvent.click(surface);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("adds selected state without changing the rendered element", () => {
    stubReducedMotion(false);

    render(
      <FalconInteractiveSurface as="article" selected aria-label="Selected vendor">
        Vendor summary
      </FalconInteractiveSurface>,
    );

    const surface = screen.getByLabelText("Selected vendor");
    expect(surface.tagName).toBe("ARTICLE");
    expect(surface).toHaveAttribute("data-interaction-selected", "true");
    expect(surface).toHaveClass("ring-2", "border-slate-900");
  });

  it("prevents disabled clicks and marks button surfaces disabled", () => {
    stubReducedMotion(false);
    const onClick = vi.fn();

    render(
      <FalconInteractiveSurface as="button" type="button" disabled onClick={onClick}>
        Disabled action
      </FalconInteractiveSurface>,
    );

    const surface = screen.getByRole("button", { name: "Disabled action" });
    expect(surface).toBeDisabled();
    expect(surface).toHaveAttribute("aria-disabled", "true");
    expect(surface).toHaveClass("cursor-not-allowed", "pointer-events-none");

    fireEvent.click(surface);

    expect(onClick).not.toHaveBeenCalled();
  });

  it("uses reduced-motion token styles when the user prefers reduced motion", () => {
    stubReducedMotion(true);

    render(
      <FalconInteractiveSurface className="quiet-action" recipe="quietSecondaryAction">
        Secondary action
      </FalconInteractiveSurface>,
    );

    const surface = screen.getByText("Secondary action");
    expect(surface).toHaveClass("quiet-action", "hover:bg-slate-50");
    expect(surface).toHaveStyle({
      "--falcon-interaction-duration": "0ms",
      "--falcon-interaction-hover-lift": "0px",
      "--falcon-interaction-press-scale": "1",
    });
  });
});
