// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import OperationalInputsReadOnly from "../OperationalInputsReadOnly";

afterEach(() => {
  cleanup();
});

describe("OperationalInputsReadOnly", () => {
  it("renders first-wave operational evidence as read-only context", () => {
    render(
      <OperationalInputsReadOnly
        inputs={[
          {
            id: "input-1",
            input_type: "report_on_track",
            actor_role: "Appraiser",
            note: "Report draft is progressing.",
            created_at: "2026-05-24T13:00:00.000Z",
            expires_at: "2026-05-26T13:00:00.000Z",
          },
        ]}
      />,
    );

    const panel = screen.getByLabelText("Operational status evidence");
    expect(within(panel).getByText("Operational Context")).toBeInTheDocument();
    expect(within(panel).getByText("Report on track")).toBeInTheDocument();
    expect(within(panel).getByText("Appraiser")).toBeInTheDocument();
    expect(within(panel).getByText("Report draft is progressing.")).toBeInTheDocument();
    expect(within(panel).queryByRole("button")).not.toBeInTheDocument();
    expect(within(panel).queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("does not render unsupported, loading, error, or empty states", () => {
    const { rerender } = render(<OperationalInputsReadOnly inputs={[]} />);
    expect(screen.queryByLabelText("Operational status evidence")).not.toBeInTheDocument();

    rerender(<OperationalInputsReadOnly loading inputs={[{ id: "input-1", input_type: "waiting_on_client" }]} />);
    expect(screen.queryByLabelText("Operational status evidence")).not.toBeInTheDocument();

    rerender(<OperationalInputsReadOnly error={new Error("Denied")} inputs={[{ id: "input-1", input_type: "waiting_on_client" }]} />);
    expect(screen.queryByLabelText("Operational status evidence")).not.toBeInTheDocument();

    rerender(<OperationalInputsReadOnly inputs={[{ id: "input-1", input_type: "inspection_complete" }]} />);
    expect(screen.queryByLabelText("Operational status evidence")).not.toBeInTheDocument();
  });
});
