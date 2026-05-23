// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  WorkspaceEmptyState,
  WorkspaceErrorState,
  WorkspaceLoadingState,
  WorkspaceState,
} from "../WorkspaceState";

describe("WorkspaceState", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders loading states with status semantics", () => {
    render(<WorkspaceLoadingState message="Loading active schedule..." />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading active schedule...");
  });

  it("renders error states with alert semantics", () => {
    render(<WorkspaceErrorState message="Calendar could not load." />);

    expect(screen.getByRole("alert")).toHaveTextContent("Calendar could not load.");
  });

  it("supports the legacy red error tone for migrated surfaces", () => {
    render(<WorkspaceErrorState message="Calendar could not load." tone="red" />);

    expect(screen.getByRole("alert")).toHaveClass("border-red-200", "bg-red-50", "text-red-700");
  });

  it("renders empty states with title and message without adding a role", () => {
    render(
      <WorkspaceEmptyState
        title="No clients match these filters"
        message="Adjust the search or category filter to broaden the relationship list."
      />,
    );

    expect(screen.getByRole("heading", { name: "No clients match these filters" })).toBeInTheDocument();
    expect(
      screen.getByText("Adjust the search or category filter to broaden the relationship list."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("preserves custom children for simple state blocks", () => {
    render(
      <WorkspaceState variant="empty" className="text-sm text-slate-600">
        Client not found.
      </WorkspaceState>,
    );

    expect(screen.getByText("Client not found.")).toBeInTheDocument();
  });
});
