// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FileReadinessSummary from "../FileReadinessSummary";

describe("FileReadinessSummary", () => {
  it("renders a read-only derived file summary from props", () => {
    render(
      <FileReadinessSummary
        documents={[
          {
            id: "doc-1",
            status: "active",
            category: "engagement",
            created_at: "2026-05-24T12:00:00.000Z",
          },
        ]}
        now={new Date("2026-05-24T12:00:00.000Z")}
      />,
    );

    expect(screen.getByLabelText("File readiness summary")).toBeInTheDocument();
    expect(screen.getByText("File Readiness")).toBeInTheDocument();
    expect(screen.getByText("Derived")).toBeInTheDocument();
    expect(screen.getByText("Recent uploads")).toBeInTheDocument();
    expect(screen.getByText("Recent document uploads detected.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders nothing when document readiness cannot be derived conservatively", () => {
    const { container } = render(
      <FileReadinessSummary order={{ id: "order-1", status: "in_progress" }} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
