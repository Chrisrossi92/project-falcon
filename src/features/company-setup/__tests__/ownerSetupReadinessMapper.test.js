import { describe, expect, it } from "vitest";

import {
  OWNER_SETUP_SECTION_STATUSES,
  mapOwnerSetupReadiness,
} from "../ownerSetupReadinessMapper.js";

const completeSetupContext = {
  company_id: "company-1",
  company_name: "Falcon Appraisal",
  company_type: "staff_shop",
  company_status: "active",
  profile_complete: true,
  active_company_context_valid: true,
  owner_invariant_ok: true,
  active_owner_count: 1,
  active_member_count: 1,
  role_presets_ready: true,
  owner_role_ready: true,
  audit_readiness: {
    has_bootstrap_audit: false,
  },
  setup_blockers: ["bootstrap_audit_event"],
};

const findSection = (result, id) => result.sections.find((section) => section.id === id);

describe("owner setup readiness mapper", () => {
  it("marks complete required sections as minimum ready", () => {
    const result = mapOwnerSetupReadiness(completeSetupContext);

    expect(result).toMatchObject({
      totalSections: 8,
      requiredSections: 3,
      completedRequiredSections: 3,
      percentComplete: 100,
      minimumReady: true,
      bannerShouldShow: false,
      nextRecommendedAction: "Company setup is ready for launch review.",
    });
    expect(findSection(result, "company_profile")).toMatchObject({
      title: "Company Profile",
      status: OWNER_SETUP_SECTION_STATUSES.COMPLETE,
      requiredForMinimumReadiness: true,
      completed: true,
      missingItems: [],
    });
  });

  it("keeps minimum readiness false when company profile is missing", () => {
    const result = mapOwnerSetupReadiness({
      ...completeSetupContext,
      company_name: "",
      profile_complete: false,
    });

    expect(result.minimumReady).toBe(false);
    expect(result.bannerShouldShow).toBe(true);
    expect(result.completedRequiredSections).toBe(2);
    expect(result.percentComplete).toBe(67);
    expect(result.nextRecommendedAction).toBe("Next: Company Profile");
    expect(findSection(result, "company_profile")).toMatchObject({
      status: OWNER_SETUP_SECTION_STATUSES.NEEDS_ATTENTION,
      completed: false,
      actionLabel: "Complete Profile",
    });
    expect(findSection(result, "company_profile").missingItems).toEqual([
      "Add a company display name.",
      "Complete the required company profile details.",
    ]);
  });

  it("does not let optional or deferred sections block minimum readiness", () => {
    const result = mapOwnerSetupReadiness({
      ...completeSetupContext,
      company_type: null,
      relationship_readiness: {},
      assignment_readiness: {},
    });

    expect(result.minimumReady).toBe(true);
    expect(result.percentComplete).toBe(100);
    expect(findSection(result, "workflow_defaults")).toMatchObject({
      status: OWNER_SETUP_SECTION_STATUSES.DEFERRED,
      requiredForMinimumReadiness: false,
      completed: false,
    });
    expect(findSection(result, "order_numbering")).toMatchObject({
      status: OWNER_SETUP_SECTION_STATUSES.DEFERRED,
      requiredForMinimumReadiness: false,
      completed: false,
    });
    expect(findSection(result, "product_modes")).toMatchObject({
      status: OWNER_SETUP_SECTION_STATUSES.OPTIONAL,
      requiredForMinimumReadiness: false,
      completed: false,
    });
  });

  it("avoids raw diagnostic language in owner-facing labels and descriptions", () => {
    const result = mapOwnerSetupReadiness(completeSetupContext);
    const ownerFacingText = JSON.stringify(
      result.sections.map((section) => ({
        title: section.title,
        description: section.description,
        missingItems: section.missingItems,
        actionLabel: section.actionLabel,
      })),
    );

    expect(ownerFacingText).not.toMatch(/bootstrap_audit_event/);
    expect(ownerFacingText).not.toMatch(/not_ready/);
    expect(ownerFacingText).not.toMatch(/unknown keys/i);
    expect(ownerFacingText).not.toMatch(/setup_blockers/);
  });

  it("keeps percent completion stable for required sections", () => {
    expect(mapOwnerSetupReadiness(null)).toMatchObject({
      completedRequiredSections: 0,
      requiredSections: 3,
      percentComplete: 0,
      minimumReady: false,
    });

    expect(
      mapOwnerSetupReadiness({
        ...completeSetupContext,
        owner_role_ready: false,
      }),
    ).toMatchObject({
      completedRequiredSections: 2,
      requiredSections: 3,
      percentComplete: 67,
      minimumReady: false,
    });
  });

  it("points the next recommended action to the first incomplete required section", () => {
    const ownerMissing = mapOwnerSetupReadiness({
      ...completeSetupContext,
      owner_invariant_ok: false,
      active_owner_count: 0,
    });
    const teamAccessMissing = mapOwnerSetupReadiness({
      ...completeSetupContext,
      active_company_context_valid: false,
      active_member_count: 0,
    });

    expect(ownerMissing.nextRecommendedAction).toBe("Next: Owner Profile");
    expect(teamAccessMissing.nextRecommendedAction).toBe("Next: Team Access");
  });
});
