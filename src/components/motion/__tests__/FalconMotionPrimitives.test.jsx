// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  FalconCardMotion,
  FalconCollapse,
  FalconFade,
  FalconListItemMotion,
  FalconListMotion,
  FalconPageMotion,
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

describe("Falcon motion primitives", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders page motion with className and standard div props", async () => {
    stubReducedMotion(false);

    render(
      <FalconPageMotion className="page-shell" aria-label="Order page" data-testid="page-motion">
        Page content
      </FalconPageMotion>,
    );

    const page = screen.getByTestId("page-motion");
    expect(page).toHaveTextContent("Page content");
    expect(page).toHaveClass("page-shell");
    expect(page).toHaveAttribute("aria-label", "Order page");

    await waitFor(() => expect(page).toHaveStyle({ opacity: "1" }));
  });

  it("uses static reduced-motion styles for entrance primitives", () => {
    stubReducedMotion(true);

    render(
      <FalconListMotion data-testid="list">
        <FalconListItemMotion className="queue-row" data-testid="item">
          Queue row
        </FalconListItemMotion>
      </FalconListMotion>,
    );

    const list = screen.getByTestId("list");
    const item = screen.getByTestId("item");

    expect(list).toHaveAttribute("data-motion-reduced", "true");
    expect(list).toHaveStyle({ "--falcon-list-item-duration": "0ms" });
    expect(item).toHaveClass("queue-row");
    expect(item).toHaveStyle({
      opacity: "1",
      transform: "translateY(0)",
      transitionDuration: "0ms",
    });
  });

  it("keeps card hover and press affordance opt-in", async () => {
    stubReducedMotion(false);
    const onPointerEnter = vi.fn();

    render(
      <FalconCardMotion
        interactive
        className="dashboard-card"
        data-testid="card"
        onPointerEnter={onPointerEnter}
      >
        Dashboard card
      </FalconCardMotion>,
    );

    const card = screen.getByTestId("card");
    expect(card).toHaveClass("falcon-card-motion-interactive", "dashboard-card");
    expect(card).toHaveAttribute("data-motion-interactive", "true");

    await waitFor(() => expect(card).toHaveStyle({ opacity: "1" }));

    fireEvent.pointerEnter(card);

    expect(onPointerEnter).toHaveBeenCalledTimes(1);
    expect(card.style.transform).toContain("translateY(-1px)");
    expect(card.style.transform).toContain("scale(0.995)");
  });

  it("renders fade and collapse states without unmounting children", () => {
    stubReducedMotion(true);

    render(
      <>
        <FalconFade show={false} className="context-fade" data-testid="fade">
          Hidden context
        </FalconFade>
        <FalconCollapse open={false} className="detail-collapse" data-testid="collapse">
          Deep detail
        </FalconCollapse>
      </>,
    );

    const fade = screen.getByTestId("fade");
    const collapse = screen.getByTestId("collapse");

    expect(fade).toHaveTextContent("Hidden context");
    expect(fade).toHaveClass("context-fade");
    expect(fade).toHaveAttribute("aria-hidden", "true");
    expect(fade).toHaveStyle({ opacity: "0", transitionDuration: "0ms" });

    expect(collapse).toHaveTextContent("Deep detail");
    expect(collapse).toHaveClass("detail-collapse");
    expect(collapse).toHaveAttribute("data-motion-state", "closed");
    expect(collapse).toHaveStyle({
      gridTemplateRows: "0fr",
      overflow: "hidden",
      transitionDuration: "0ms",
    });
  });
});
