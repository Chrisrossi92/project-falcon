// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  WorkspaceSurface,
  workspaceSurfaceClassNames,
  workspaceSurfaceRecipes,
} from "../WorkspaceSurface";

describe("WorkspaceSurface", () => {
  it("defines the A3.1 operational surface recipes", () => {
    expect(workspaceSurfaceRecipes.primary).toContain("border-slate-200");
    expect(workspaceSurfaceRecipes.secondary).toContain("bg-slate-50/80");
    expect(workspaceSurfaceRecipes.action).toContain("border-slate-300");
    expect(workspaceSurfaceRecipes.evidence).toContain("bg-slate-50");
    expect(workspaceSurfaceRecipes.priority).toContain("border-amber-200");
    expect(workspaceSurfaceRecipes.table).toContain("overflow-hidden");
  });

  it("renders a passive surface without adding interaction behavior", () => {
    render(
      <WorkspaceSurface variant="primary" aria-label="Orders worklist">
        Active orders
      </WorkspaceSurface>,
    );

    const surface = screen.getByLabelText("Orders worklist");
    expect(surface).toHaveTextContent("Active orders");
    expect(surface).toHaveClass(
      "rounded-2xl",
      "border-slate-200",
      "bg-white",
      "shadow-sm",
      "ring-1",
      "transition-[border-color,box-shadow,background-color,transform]",
      "motion-reduce:transition-none",
    );
    expect(surface).not.toHaveClass("hover:shadow-md");
  });

  it("keeps tactile elevation opt-in", () => {
    render(
      <WorkspaceSurface variant="action" interactive aria-label="Review decision">
        Approve report
      </WorkspaceSurface>,
    );

    expect(screen.getByLabelText("Review decision")).toHaveClass(
      "hover:-translate-y-0.5",
      "hover:shadow-md",
      "focus-within:ring-2",
      "motion-reduce:hover:translate-y-0",
    );
  });

  it("allows element and class overrides without changing the recipe fallback", () => {
    render(
      <WorkspaceSurface
        as="aside"
        variant="unknown"
        className="custom-evidence-surface"
        aria-label="Order evidence"
      >
        Read-only status
      </WorkspaceSurface>,
    );

    const surface = screen.getByLabelText("Order evidence");
    expect(surface.tagName).toBe("ASIDE");
    expect(surface).toHaveClass("rounded-xl", "bg-slate-50/80", "custom-evidence-surface");
  });

  it("composes classes for non-component callers", () => {
    expect(workspaceSurfaceClassNames("table", "min-w-0")).toContain("overflow-hidden");
    expect(workspaceSurfaceClassNames("table", "min-w-0")).toContain("min-w-0");
  });
});
