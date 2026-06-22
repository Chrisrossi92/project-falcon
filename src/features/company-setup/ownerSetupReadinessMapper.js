export const OWNER_SETUP_SECTION_STATUSES = Object.freeze({
  COMPLETE: "complete",
  NEEDS_ATTENTION: "needs_attention",
  OPTIONAL: "optional",
  DEFERRED: "deferred",
  DIAGNOSTIC_ONLY: "diagnostic_only",
});

const SECTION_IDS = Object.freeze({
  COMPANY_PROFILE: "company_profile",
  OWNER_PROFILE: "owner_profile",
  TEAM_ACCESS: "team_access",
  WORKFLOW_DEFAULTS: "workflow_defaults",
  NOTIFICATION_DEFAULTS: "notification_defaults",
  ORDER_NUMBERING: "order_numbering",
  BRANDING: "branding",
  PRODUCT_MODES: "product_modes",
});

const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const readValue = (context, ...keys) => {
  if (!isRecord(context)) return undefined;

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(context, key)) {
      return context[key];
    }
  }

  return undefined;
};

const readBoolean = (context, fallback, ...keys) => {
  const value = readValue(context, ...keys);
  return typeof value === "boolean" ? value : fallback;
};

const readNumber = (context, fallback, ...keys) => {
  const value = readValue(context, ...keys);
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
};

const hasText = (value) => typeof value === "string" && value.trim().length > 0;

const freezeArray = (items = []) => Object.freeze([...items]);

function createRequiredSection({ id, title, description, completed, missingItems, actionLabel }) {
  return Object.freeze({
    id,
    title,
    description,
    status: completed
      ? OWNER_SETUP_SECTION_STATUSES.COMPLETE
      : OWNER_SETUP_SECTION_STATUSES.NEEDS_ATTENTION,
    requiredForMinimumReadiness: true,
    completed,
    missingItems: freezeArray(missingItems),
    actionLabel,
  });
}

function createOptionalSection({
  id,
  title,
  description,
  status,
  completed = false,
  missingItems = [],
  actionLabel,
}) {
  return Object.freeze({
    id,
    title,
    description,
    status,
    requiredForMinimumReadiness: false,
    completed,
    missingItems: freezeArray(missingItems),
    actionLabel,
  });
}

function buildCompanyProfileSection(context) {
  const companyId = readValue(context, "company_id", "companyId");
  const companyStatus = readValue(context, "company_status", "companyStatus");
  const companyName = readValue(context, "company_name", "companyName");
  const profileComplete = readBoolean(context, false, "profile_complete", "profileComplete");
  const completed = Boolean(companyId) && companyStatus === "active" && profileComplete && hasText(companyName);
  const missingItems = [];

  if (!hasText(companyName)) missingItems.push("Add a company display name.");
  if (companyStatus !== "active") missingItems.push("Confirm the company is active.");
  if (!profileComplete) missingItems.push("Complete the required company profile details.");

  return createRequiredSection({
    id: SECTION_IDS.COMPANY_PROFILE,
    title: "Company Profile",
    description: "Confirm the company identity owners and staff will recognize across Falcon.",
    completed,
    missingItems,
    actionLabel: completed ? "Review Profile" : "Complete Profile",
  });
}

function buildOwnerProfileSection(context) {
  const ownerInvariantOk = readBoolean(context, false, "owner_invariant_ok", "ownerInvariantOk");
  const ownerRoleReady = readBoolean(context, false, "owner_role_ready", "ownerRoleReady");
  const activeOwnerCount = readNumber(context, 0, "active_owner_count", "activeOwnerCount");
  const completed = ownerInvariantOk && ownerRoleReady && activeOwnerCount > 0;
  const missingItems = [];

  if (!ownerInvariantOk || activeOwnerCount <= 0) {
    missingItems.push("Confirm an active owner is assigned to the company.");
  }
  if (!ownerRoleReady) {
    missingItems.push("Confirm the owner role is ready for this company.");
  }

  return createRequiredSection({
    id: SECTION_IDS.OWNER_PROFILE,
    title: "Owner Profile",
    description: "Confirm the first owner identity and role used for company administration.",
    completed,
    missingItems,
    actionLabel: completed ? "Review Owner" : "Review Owner Profile",
  });
}

function buildTeamAccessSection(context) {
  const activeCompanyContextValid = readBoolean(
    context,
    false,
    "active_company_context_valid",
    "activeCompanyContextValid",
  );
  const activeMemberCount = readNumber(context, 0, "active_member_count", "activeMemberCount");
  const rolePresetsReady = readBoolean(context, false, "role_presets_ready", "rolePresetsReady");
  const completed = activeCompanyContextValid && activeMemberCount > 0 && rolePresetsReady;
  const missingItems = [];

  if (!activeCompanyContextValid || activeMemberCount <= 0) {
    missingItems.push("Confirm at least one active company member can access the workspace.");
  }
  if (!rolePresetsReady) {
    missingItems.push("Confirm team role presets are available.");
  }

  return createRequiredSection({
    id: SECTION_IDS.TEAM_ACCESS,
    title: "Team Access",
    description: "Review who can access this company workspace and manage owner/admin coverage.",
    completed,
    missingItems,
    actionLabel: completed ? "Review Team Access" : "Open Team Access",
  });
}

function buildOptionalSections(context) {
  const companyType = readValue(context, "company_type", "companyType");

  return [
    createOptionalSection({
      id: SECTION_IDS.WORKFLOW_DEFAULTS,
      title: "Workflow Defaults",
      description: "Use Falcon's current workflow defaults until company-level controls are ready.",
      status: OWNER_SETUP_SECTION_STATUSES.DEFERRED,
      missingItems: ["Workflow defaults will be configured in a later governed settings slice."],
    }),
    createOptionalSection({
      id: SECTION_IDS.NOTIFICATION_DEFAULTS,
      title: "Notification Defaults",
      description: "Company notification defaults are optional while safe system defaults exist.",
      status: OWNER_SETUP_SECTION_STATUSES.OPTIONAL,
      actionLabel: "Review Later",
    }),
    createOptionalSection({
      id: SECTION_IDS.ORDER_NUMBERING,
      title: "Order Numbering",
      description: "Order numbers remain backend-controlled until owner configuration is ready.",
      status: OWNER_SETUP_SECTION_STATUSES.DEFERRED,
      missingItems: ["Order numbering setup is waiting for a stable guarded configuration path."],
    }),
    createOptionalSection({
      id: SECTION_IDS.BRANDING,
      title: "Branding",
      description: "Branding is optional unless an enabled external workspace requires it.",
      status: OWNER_SETUP_SECTION_STATUSES.OPTIONAL,
      actionLabel: "Review Later",
    }),
    createOptionalSection({
      id: SECTION_IDS.PRODUCT_MODES,
      title: "Product Modes / Modules",
      description: "Review active Falcon workspaces without using setup as security authority.",
      status: OWNER_SETUP_SECTION_STATUSES.OPTIONAL,
      completed: hasText(companyType),
      actionLabel: "Review Modes",
    }),
  ];
}

export function mapOwnerSetupReadiness(setupContext) {
  const context = isRecord(setupContext) ? setupContext : {};
  const sections = Object.freeze([
    buildCompanyProfileSection(context),
    buildOwnerProfileSection(context),
    buildTeamAccessSection(context),
    ...buildOptionalSections(context),
  ]);
  const requiredSections = sections.filter((section) => section.requiredForMinimumReadiness);
  const completedRequiredSections = requiredSections.filter((section) => section.completed);
  const firstIncompleteRequiredSection = requiredSections.find((section) => !section.completed);
  const minimumReady = requiredSections.length > 0
    && completedRequiredSections.length === requiredSections.length;
  const percentComplete = requiredSections.length
    ? Math.round((completedRequiredSections.length / requiredSections.length) * 100)
    : 0;

  return Object.freeze({
    sections,
    totalSections: sections.length,
    completedRequiredSections: completedRequiredSections.length,
    requiredSections: requiredSections.length,
    percentComplete,
    minimumReady,
    bannerShouldShow: !minimumReady,
    nextRecommendedAction: firstIncompleteRequiredSection
      ? `Next: ${firstIncompleteRequiredSection.title}`
      : "Company setup is ready for launch review.",
  });
}
