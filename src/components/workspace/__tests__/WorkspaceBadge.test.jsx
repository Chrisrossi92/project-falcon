// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import WorkspaceBadge from "../WorkspaceBadge.jsx";
import { OPERATIONS_MODES } from "@/lib/operations/operationsMode";

describe("WorkspaceBadge", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders the Internal Operations environment badge", () => {
    render(<WorkspaceBadge operationsMode={OPERATIONS_MODES.INTERNAL_OPERATIONS} />);

    const badge = screen.getByTestId("workspace-identity-badge");
    expect(badge).toHaveTextContent("Internal");
    expect(badge).toHaveAttribute("title", "Continental Internal Operations environment");
    expect(badge).toHaveClass("bg-slate-100");
  });

  it("renders the AMC Operations environment badge", () => {
    render(<WorkspaceBadge operationsMode={OPERATIONS_MODES.AMC_OPERATIONS} />);

    const badge = screen.getByTestId("workspace-identity-badge");
    expect(badge).toHaveTextContent("AMC");
    expect(badge).toHaveAttribute("title", "Falcon AMC environment");
    expect(badge).toHaveClass("bg-cyan-50");
  });
});
