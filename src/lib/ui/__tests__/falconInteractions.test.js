import { describe, expect, it } from "vitest";

import {
  falconInteractionClassNames,
  falconInteractionClasses,
  falconInteractionRecipes,
  falconInteractionStyles,
} from "../falconInteractions";

describe("falconInteractions", () => {
  it("exports shared interaction class families", () => {
    expect(falconInteractionClasses.clickableSurface).toContain("cursor-pointer");
    expect(falconInteractionClasses.subtleHoverLift).toContain(
      "hover:translate-y-[var(--falcon-interaction-hover-lift)]",
    );
    expect(falconInteractionClasses.pressFeedback).toContain(
      "active:scale-[var(--falcon-interaction-press-scale)]",
    );
    expect(falconInteractionClasses.focusVisibleRing).toContain("focus-visible:ring-2");
    expect(falconInteractionClasses.destructiveAction).toContain("text-rose-700");
  });

  it("defines stable recipes for common interactive surfaces", () => {
    expect(falconInteractionRecipes.clickableSurface).toEqual(
      expect.arrayContaining(["clickableSurface", "subtleHoverLift", "pressFeedback"]),
    );
    expect(falconInteractionRecipes.row).toEqual(expect.arrayContaining(["rowHover"]));
    expect(falconInteractionRecipes.card).toEqual(expect.arrayContaining(["cardHover"]));
    expect(falconInteractionRecipes.quietSecondaryAction).toEqual(
      expect.arrayContaining(["quietSecondaryAction"]),
    );
  });

  it("composes selected, disabled, and caller classes", () => {
    const className = falconInteractionClassNames("card", {
      className: "custom-card",
      disabled: true,
      selected: true,
    });

    expect(className).toContain("custom-card");
    expect(className).toContain("ring-2");
    expect(className).toContain("cursor-not-allowed");
    expect(className).toContain("hover:shadow-md");
  });

  it("resolves token-driven styles for standard and reduced motion", () => {
    expect(falconInteractionStyles()).toEqual(
      expect.objectContaining({
        "--falcon-interaction-duration": "140ms",
        "--falcon-interaction-easing": "cubic-bezier(0.2, 0, 0, 1)",
        "--falcon-interaction-hover-lift": "-1px",
        "--falcon-interaction-press-scale": 0.98,
      }),
    );

    expect(falconInteractionStyles({ reducedMotion: true })).toEqual(
      expect.objectContaining({
        "--falcon-interaction-duration": "0ms",
        "--falcon-interaction-hover-lift": "0px",
        "--falcon-interaction-press-scale": 1,
      }),
    );
  });
});
