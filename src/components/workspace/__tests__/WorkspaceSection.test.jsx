// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkspaceSection, WorkspaceSectionMeta } from "../WorkspaceSection";

describe("WorkspaceSection", () => {
  it("renders a passive labeled section with support copy and content", () => {
    render(
      <WorkspaceSection
        title="Schedule Board"
        description="Calendar work remains scoped to already loaded events."
      >
        <div>Calendar grid</div>
      </WorkspaceSection>,
    );

    const heading = screen.getByRole("heading", { name: "Schedule Board" });
    expect(heading).toBeInTheDocument();
    expect(screen.getByText("Calendar work remains scoped to already loaded events.")).toBeInTheDocument();
    expect(screen.getByText("Calendar grid")).toBeInTheDocument();
  });

  it("supports read-only meta without adding interaction behavior", () => {
    render(
      <WorkspaceSection
        title="Client Directory"
        meta={<WorkspaceSectionMeta>12 clients</WorkspaceSectionMeta>}
      >
        <div>Directory cards</div>
      </WorkspaceSection>,
    );

    expect(screen.getByText("12 clients")).toHaveClass("text-sm", "font-medium", "text-slate-600");
    expect(screen.getByText("Directory cards")).toBeInTheDocument();
  });

  it("allows surface-specific class overrides", () => {
    render(
      <WorkspaceSection
        title="Visible Order Context"
        className="rounded-lg border bg-white"
        headerClassName="mb-3"
        titleClassName="text-sm font-semibold"
      >
        <div>Context tiles</div>
      </WorkspaceSection>,
    );

    expect(screen.getByRole("heading", { name: "Visible Order Context" })).toHaveClass(
      "text-sm",
      "font-semibold",
    );
    expect(screen.getByText("Context tiles")).toBeInTheDocument();
  });
});
