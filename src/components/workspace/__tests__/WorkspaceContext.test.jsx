// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WorkspaceContextStrip, WorkspaceContextTile } from "../WorkspaceContext";

describe("WorkspaceContext", () => {
  it("renders a labeled read-only context strip", () => {
    render(
      <WorkspaceContextStrip ariaLabel="Calendar workspace context">
        <WorkspaceContextTile label="Company" value="Falcon Appraisals" />
      </WorkspaceContextStrip>,
    );

    expect(screen.getByLabelText("Calendar workspace context")).toBeInTheDocument();
    expect(screen.getByText("Company")).toBeInTheDocument();
    expect(screen.getByText("Falcon Appraisals")).toBeInTheDocument();
  });

  it("allows surface-specific class overrides without adding behavior", () => {
    render(
      <WorkspaceContextTile
        label="Work view"
        value="Packet-scoped"
        className="rounded-md border-slate-100 bg-slate-50"
        labelClassName="tracking-[0.12em] text-slate-400"
        valueClassName="font-semibold text-slate-800"
      />,
    );

    expect(screen.getByText("Work view")).toHaveClass("tracking-[0.12em]", "text-slate-400");
    expect(screen.getByText("Packet-scoped")).toHaveClass("font-semibold", "text-slate-800");
  });

  it("keeps tactile feedback opt-in for context tiles", () => {
    const { rerender } = render(
      <WorkspaceContextTile label="Access" value="Packet scoped" />,
    );

    expect(screen.getByText("Access").parentElement).toHaveClass(
      "transition-[border-color,box-shadow,background-color,transform]",
      "motion-reduce:transition-none",
    );
    expect(screen.getByText("Access").parentElement).not.toHaveClass("hover:shadow-md");

    rerender(<WorkspaceContextTile label="Access" value="Packet scoped" interactive />);

    expect(screen.getByText("Access").parentElement).toHaveClass(
      "hover:-translate-y-0.5",
      "hover:shadow-md",
      "focus-within:ring-2",
      "motion-reduce:hover:translate-y-0",
    );
  });
});
