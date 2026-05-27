import { describe, expect, it } from "vitest";

import {
  deriveDashboardRoleFlags,
  deriveDashboardTableFilters,
  deriveReviewerHybridAppraisalFilters,
} from "../useDashboardSummary.js";

describe("deriveDashboardRoleFlags", () => {
  it("keeps reviewer-primary appraiser-secondary users in the reviewer dashboard lens", () => {
    expect(
      deriveDashboardRoleFlags({
        primary_role_key: "reviewer",
        role_keys: ["reviewer", "appraiser"],
        is_owner: false,
        is_admin_role: false,
        is_reviewer_role: true,
        is_appraiser_role: true,
      }),
    ).toMatchObject({
      role: "reviewer",
      isReviewer: true,
      isAppraiser: false,
    });
  });

  it("keeps appraiser-primary reviewer-secondary users in the appraiser dashboard lens", () => {
    expect(
      deriveDashboardRoleFlags({
        primary_role_key: "appraiser",
        role_keys: ["appraiser", "reviewer"],
        is_owner: false,
        is_admin_role: false,
        is_reviewer_role: true,
        is_appraiser_role: true,
      }),
    ).toMatchObject({
      role: "appraiser",
      isReviewer: false,
      isAppraiser: true,
    });
  });

  it("keeps owner and admin worldview ahead of production role flags", () => {
    expect(
      deriveDashboardRoleFlags({
        primary_role_key: "owner",
        role_keys: ["owner", "appraiser"],
        is_owner: true,
        is_admin_role: false,
        is_reviewer_role: false,
        is_appraiser_role: true,
      }),
    ).toMatchObject({
      role: "owner",
      isOwner: true,
      isAdmin: true,
      isReviewer: false,
      isAppraiser: false,
    });
  });

  it("queries reviewer-primary dashboard data with the full active review queue status set", () => {
    expect(
      deriveDashboardTableFilters({
        appContext: {
          primary_role_key: "reviewer",
          role_keys: ["reviewer", "appraiser"],
          is_reviewer_role: true,
          is_appraiser_role: true,
        },
        userId: "pam-user",
      }),
    ).toMatchObject({
      activeOnly: false,
      reviewerId: "pam-user",
      statusIn: ["in_review", "needs_revisions", "review_cleared"],
    });
  });

  it("queries appraiser-primary dashboard data as assigned appraisal work", () => {
    expect(
      deriveDashboardTableFilters({
        appContext: {
          primary_role_key: "appraiser",
          role_keys: ["appraiser", "reviewer"],
          is_reviewer_role: true,
          is_appraiser_role: true,
        },
        userId: "pam-user",
      }),
    ).toMatchObject({
      activeOnly: false,
      appraiserId: "pam-user",
      assignedAppraiserId: "pam-user",
      statusIn: ["new", "in_progress", "needs_revisions"],
    });
  });

  it("does not mix secondary appraiser work into reviewer-primary dashboard filters", () => {
    expect(
      deriveDashboardTableFilters({
        appContext: {
          primary_role_key: "reviewer",
          role_keys: ["reviewer", "appraiser"],
          is_reviewer_role: true,
          is_appraiser_role: true,
        },
        userId: "pam-user",
      }),
    ).toEqual({
      activeOnly: false,
      reviewerId: "pam-user",
      statusIn: ["in_review", "needs_revisions", "review_cleared"],
    });
  });

  it("derives a separate appraisal-work table filter for reviewer-primary appraiser hybrids", () => {
    expect(
      deriveReviewerHybridAppraisalFilters({
        appContext: {
          primary_role_key: "reviewer",
          role_keys: ["reviewer", "appraiser"],
          is_reviewer_role: true,
          is_appraiser_role: true,
        },
        userId: "pam-user",
      }),
    ).toEqual({
      activeOnly: false,
      appraiserId: "pam-user",
      assignedAppraiserId: "pam-user",
      statusIn: ["new", "in_progress", "needs_revisions"],
    });

    expect(
      deriveReviewerHybridAppraisalFilters({
        appContext: {
          primary_role_key: "reviewer",
          role_keys: ["reviewer"],
          is_reviewer_role: true,
          is_appraiser_role: false,
        },
        userId: "reviewer-user",
      }),
    ).toBeNull();
  });
});
