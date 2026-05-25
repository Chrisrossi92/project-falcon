// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import AppraiserWorkbenchPreview from "../AppraiserWorkbenchPreview.jsx";
import ReviewerWorkbenchPreview from "../ReviewerWorkbenchPreview.jsx";

function dateFromToday(daysFromNow) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString();
}

describe("passive workbench previews", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders appraiser-native My Work copy from provided rows", () => {
    render(
      <AppraiserWorkbenchPreview
        appraiserLabel="Staff Appraiser"
        rows={[
          {
            id: "assigned-1",
            order_number: "CF-1001",
            client_name: "Continental",
            status: "in_progress",
            final_due_date: dateFromToday(2),
            site_visit_at: dateFromToday(1),
          },
          {
            id: "assigned-2",
            order_number: "CF-1002",
            property_address: "200 Revision Ave",
            status: "needs_revisions",
            final_due_date: dateFromToday(-1),
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "My Work" })).toBeInTheDocument();
    expect(screen.getByText("Staff Appraiser")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Start with the assigned orders that need attention today: revisions, due pressure, inspection context, and waiting or blocked work derived from the current order rows.",
      ),
    ).toBeInTheDocument();

    const priorityWork = screen.getByRole("region", { name: "Priority Work" });
    expect(within(priorityWork).getByText("2")).toBeInTheDocument();
    expect(within(priorityWork).getByRole("link", { name: "CF-1001" })).toHaveAttribute(
      "href",
      "/orders/assigned-1",
    );
    expect(within(priorityWork).getByRole("link", { name: "CF-1002" })).toHaveAttribute(
      "href",
      "/orders/assigned-2",
    );

    const revisions = screen.getByRole("region", { name: "Revisions Required" });
    expect(within(revisions).getByText("1")).toBeInTheDocument();
    const dueSoon = screen.getByRole("region", { name: "Due Soon / Overdue" });
    expect(within(dueSoon).getByText("2")).toBeInTheDocument();
    const siteVisit = screen.getByRole("region", { name: "Upcoming Inspections" });
    expect(within(siteVisit).getByText("1")).toBeInTheDocument();
    const waiting = screen.getByRole("region", { name: "Waiting / Blocked Context" });
    expect(within(waiting).getByText("0")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders appraiser-native empty states from empty props", () => {
    render(<AppraiserWorkbenchPreview rows={[]} />);

    expect(screen.getByRole("heading", { name: "My Work" })).toBeInTheDocument();
    expect(
      screen.getByText("No assigned order rows need priority placement from the provided data."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No due-soon or overdue assigned work is represented in these rows."),
    ).toBeInTheDocument();
    expect(screen.getByText("No revision requests are represented in these rows.")).toBeInTheDocument();
    expect(screen.getByText("No upcoming inspection context is represented in these rows.")).toBeInTheDocument();
    expect(screen.getByText("No waiting or blocked context is represented in these rows.")).toBeInTheDocument();
    expect(
      screen.getByText("No lower-priority assigned work remains outside today's priority grouping."),
    ).toBeInTheDocument();
  });

  it("renders the compact My Work dashboard entry without duplicating full lane sections", () => {
    render(
      <AppraiserWorkbenchPreview
        compact
        rows={[
          {
            id: "assigned-1",
            order_number: "CF-1001",
            status: "in_progress",
            final_due_date: dateFromToday(2),
          },
        ]}
      />,
    );

    const summary = screen.getByRole("region", { name: "My Work summary" });

    expect(within(summary).getByRole("heading", { name: "My Work" })).toBeInTheDocument();
    expect(within(summary).getByRole("link", { name: "Open My Work" })).toHaveAttribute(
      "href",
      "/my-work",
    );
    expect(within(summary).queryByRole("region", { name: "Priority Work" })).toBeNull();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders reviewer-native Review Queue copy from provided rows", () => {
    render(
      <ReviewerWorkbenchPreview
        reviewerLabel="Review Lead"
        rows={[
          {
            id: "review-1",
            status: "in_review",
            review_due_at: dateFromToday(1),
            revision_count: 2,
          },
          {
            id: "review-2",
            status: "resubmitted",
            resubmitted: true,
            review_due_at: dateFromToday(-1),
          },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Review Queue" })).toBeInTheDocument();
    expect(screen.getByText("Review Lead")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Review submitted work, resubmissions, revision loops, due pressure, report/file context, and review-note readiness from provided order rows.",
      ),
    ).toBeInTheDocument();

    const inReview = screen.getByRole("region", { name: "In Review" });
    expect(within(inReview).getByText("1")).toBeInTheDocument();
    const resubmitted = screen.getByRole("region", { name: "Resubmitted Work" });
    expect(within(resubmitted).getByText("1")).toBeInTheDocument();
    const duePressure = screen.getByRole("region", { name: "Due Soon / Overdue Review" });
    expect(within(duePressure).getByText("2")).toBeInTheDocument();
    const revisionFollowUp = screen.getByRole("region", { name: "Revision Follow-Up" });
    expect(within(revisionFollowUp).getByText("1")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders reviewer-native empty states from empty props", () => {
    render(<ReviewerWorkbenchPreview rows={[]} />);

    expect(screen.getByRole("heading", { name: "Review Queue" })).toBeInTheDocument();
    expect(screen.getByText("No review rows were provided.")).toBeInTheDocument();
    expect(screen.getByText("No resubmitted work is represented in these rows.")).toBeInTheDocument();
    expect(
      screen.getByText("No due-soon or overdue review work is represented in these rows."),
    ).toBeInTheDocument();
    expect(screen.getByText("No revision loops are represented in these rows.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Review notes and files remain order-scoped and are not loaded in this passive preview.",
      ),
    ).toBeInTheDocument();
  });

  it("keeps the preview sources presentational and disconnected from live authority surfaces", () => {
    const sources = [
      readFileSync(
        join(
          process.cwd(),
          "src/features/dashboard/workbenches/AppraiserWorkbenchPreview.jsx",
        ),
        "utf8",
      ),
      readFileSync(
        join(
          process.cwd(),
          "src/features/dashboard/workbenches/ReviewerWorkbenchPreview.jsx",
        ),
        "utf8",
      ),
    ];

    for (const source of sources) {
      expect(source).not.toMatch(/from\s+["']@\/lib/);
      expect(source).not.toMatch(/from\s+["']@\/api/);
      expect(source).not.toMatch(/react-router|useNavigate|DashboardGate|DashboardPage/);
      expect(source).not.toMatch(/supabase|createClient|useDashboard|useEffectivePermissions/);
      expect(source).not.toMatch(/requestRevisions|clearReview|submitToReview|resubmitToReview/);
    }
  });
});
