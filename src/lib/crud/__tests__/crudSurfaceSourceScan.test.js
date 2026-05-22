import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const srcRoot = resolve(repoRoot, "src");

const WATCHLIST = new Set([
  "src/lib/api/orders.js",
  "src/lib/api/reviews.js",
  "src/lib/api/users.js",
  "src/lib/services/ordersService.js",
  "src/lib/utils/updateOrderStatus.js",
]);

const ORDER_RETIREMENT_HELPER_FILES = new Set([
  "src/lib/api/orders.js",
  "src/lib/services/ordersService.js",
]);

const ORDER_ARCHIVE_RPC_WRAPPER_FILES = new Set([
  "src/lib/services/ordersService.js",
  "src/pages/orders/OrderDetail.jsx",
]);

const ORDER_CANCEL_VOID_RPC_WRAPPER_FILES = new Set([
  "src/lib/services/ordersService.js",
  "src/pages/orders/OrderDetail.jsx",
]);

const ORDER_INCLUDE_ARCHIVED_FILES = new Set([
  "src/features/orders/api.js",
  "src/lib/api/orders.js",
]);

const ORDER_INCLUDE_RETIRED_LIFECYCLE_FILES = new Set([
  "src/features/orders/api.js",
  "src/lib/api/orders.js",
]);

const LEGACY_ORDER_STATUS_HELPER_FILES = new Set([
  "src/features/orders/OrderActionsPanel.jsx",
  "src/features/orders/actions.js",
  "src/lib/api/orders.js",
  "src/lib/services/ordersService.js",
  "src/lib/utils/updateOrderStatus.js",
]);

const LEGACY_ORDER_ASSIGNMENT_HELPER_FILES = new Set([
  "src/features/orders/OrderActionsPanel.jsx",
  "src/features/orders/actions.js",
  "src/lib/api/orders.js",
  "src/lib/services/ordersService.js",
]);

const ORDER_WORKFLOW_TRANSITION_RPC_FILES = new Set([
  "src/lib/services/ordersService.js",
]);

const TABLES = [
  "orders",
  "clients",
  "activity_log",
  "notification_prefs",
  "notification_preferences",
  "users",
  "company_memberships",
  "user_role_assignments",
];

function walkFiles(dir) {
  if (!existsSync(dir)) return [];

  return readdirSync(dir).flatMap((entry) => {
    const fullPath = resolve(dir, entry);
    const rel = relative(repoRoot, fullPath);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (
        rel.includes("__tests__")
        || rel.startsWith("src/archive")
        || rel.startsWith("src/assets")
      ) {
        return [];
      }
      return walkFiles(fullPath);
    }

    if (!/\.(js|jsx|ts|tsx)$/.test(entry)) return [];
    return [fullPath];
  });
}

function directWriteFindings() {
  const findings = [];

  for (const filePath of walkFiles(srcRoot)) {
    const rel = relative(repoRoot, filePath);
    const source = readFileSync(filePath, "utf8");

    for (const table of TABLES) {
      const pattern = new RegExp(
        String.raw`\.from\(\s*["']${table}["']\s*\)[\s\S]{0,700}\.(insert|update|upsert|delete)\s*\(`,
        "g",
      );

      for (const match of source.matchAll(pattern)) {
        findings.push({
          file: rel,
          table,
          method: match[1],
        });
      }
    }
  }

  return findings;
}

function orderDeleteFindings() {
  const findings = [];

  for (const filePath of walkFiles(srcRoot)) {
    const rel = relative(repoRoot, filePath);
    const source = readFileSync(filePath, "utf8");
    const pattern = /\.from\(\s*["']orders["']\s*\)[\s\S]{0,700}\.delete\s*\(/g;

    for (const match of source.matchAll(pattern)) {
      findings.push({
        file: rel,
        index: match.index,
      });
    }
  }

  return findings;
}

function directOrderArchiveFindings() {
  const findings = [];

  for (const filePath of walkFiles(srcRoot)) {
    const rel = relative(repoRoot, filePath);
    const source = readFileSync(filePath, "utf8");
    const patterns = [
      /\.from\(\s*["']orders["']\s*\)[\s\S]{0,700}\.update\s*\(\s*\{[\s\S]{0,300}is_archived\s*:\s*true/g,
      /is_archived\s*=\s*true/g,
    ];

    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        findings.push({
          file: rel,
          index: match.index,
        });
      }
    }
  }

  return findings;
}

function directOrderStatusMutationFindings() {
  const findings = [];

  for (const filePath of walkFiles(srcRoot)) {
    const rel = relative(repoRoot, filePath);
    const source = readFileSync(filePath, "utf8");
    const patterns = [
      /\.from\(\s*["']orders["']\s*\)[\s\S]{0,700}\.update\s*\(\s*\{[\s\S]{0,300}\bstatus\s*:/g,
      /\.from\(\s*ORDERS_TABLE\s*\)[\s\S]{0,700}\.update\s*\(\s*\{[\s\S]{0,300}\bstatus\s*:/g,
    ];

    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        findings.push({
          file: rel,
          index: match.index,
        });
      }
    }
  }

  return findings;
}

function directOrderAssignmentMutationFindings() {
  const findings = [];

  for (const filePath of walkFiles(srcRoot)) {
    const rel = relative(repoRoot, filePath);
    const source = readFileSync(filePath, "utf8");
    const patterns = [
      /\.from\(\s*["']orders["']\s*\)[\s\S]{0,700}\.(insert|update|upsert)\s*\(\s*\{[\s\S]{0,300}\b(appraiser_id|assigned_to|reviewer_id|current_reviewer_id)\s*:/g,
      /\.from\(\s*ORDERS_TABLE\s*\)[\s\S]{0,700}\.(insert|update|upsert)\s*\(\s*\{[\s\S]{0,300}\b(appraiser_id|assigned_to|reviewer_id|current_reviewer_id)\s*:/g,
    ];

    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        findings.push({
          file: rel,
          method: match[1],
          field: match[2],
          index: match.index,
        });
      }
    }
  }

  return findings;
}

function legacyOrderStatusHelperReachabilityFindings() {
  const findings = [];

  for (const filePath of walkFiles(srcRoot)) {
    const rel = relative(repoRoot, filePath);
    if (LEGACY_ORDER_STATUS_HELPER_FILES.has(rel)) continue;

    const source = readFileSync(filePath, "utf8");
    const pattern = /\b(setOrderStatus|updateOrderStatus|bulkUpdateStatus|startReview|requestRevisions|markComplete|putOnHold|resumeInProgress|sendToClient|markDelivered)\b/g;

    for (const match of source.matchAll(pattern)) {
      findings.push({
        file: rel,
        helper: match[1],
        index: match.index,
      });
    }
  }

  return findings;
}

function legacyOrderAssignmentHelperReachabilityFindings() {
  const findings = [];

  for (const filePath of walkFiles(srcRoot)) {
    const rel = relative(repoRoot, filePath);
    if (LEGACY_ORDER_ASSIGNMENT_HELPER_FILES.has(rel)) continue;

    const source = readFileSync(filePath, "utf8");
    const pattern = /\b(assignParticipants|assignAppraiser|assignReviewer|updateAssignees|bulkAssignAppraiser|assignOrder)\b/g;

    for (const match of source.matchAll(pattern)) {
      findings.push({
        file: rel,
        helper: match[1],
        index: match.index,
      });
    }
  }

  return findings;
}

function directWorkflowTransitionRpcFindings() {
  const findings = [];

  for (const filePath of walkFiles(srcRoot)) {
    const rel = relative(repoRoot, filePath);
    if (ORDER_WORKFLOW_TRANSITION_RPC_FILES.has(rel)) continue;

    const source = readFileSync(filePath, "utf8");
    const pattern = /\brpc_transition_order_status\b/g;

    for (const match of source.matchAll(pattern)) {
      findings.push({
        file: rel,
        index: match.index,
      });
    }
  }

  return findings;
}

function orderRetirementHelperReachabilityFindings() {
  const findings = [];

  for (const filePath of walkFiles(srcRoot)) {
    const rel = relative(repoRoot, filePath);
    if (ORDER_RETIREMENT_HELPER_FILES.has(rel)) continue;

    const source = readFileSync(filePath, "utf8");
    const pattern = /\b(deleteOrder|archiveOrder)\b/g;

    for (const match of source.matchAll(pattern)) {
      findings.push({
        file: rel,
        helper: match[1],
      });
    }
  }

  return findings;
}

function activeOrderArchiveRpcReachabilityFindings() {
  const findings = [];

  for (const filePath of walkFiles(srcRoot)) {
    const rel = relative(repoRoot, filePath);
    if (ORDER_ARCHIVE_RPC_WRAPPER_FILES.has(rel)) continue;

    const source = readFileSync(filePath, "utf8");
    const pattern = /\barchiveOrderViaRpc\b/g;

    for (const match of source.matchAll(pattern)) {
      findings.push({
        file: rel,
        index: match.index,
      });
    }
  }

  return findings;
}

function activeOrderCancelVoidRpcReachabilityFindings() {
  const findings = [];

  for (const filePath of walkFiles(srcRoot)) {
    const rel = relative(repoRoot, filePath);
    if (ORDER_CANCEL_VOID_RPC_WRAPPER_FILES.has(rel)) continue;

    const source = readFileSync(filePath, "utf8");
    const pattern = /\b(cancelOrderViaRpc|voidOrderViaRpc)\b/g;

    for (const match of source.matchAll(pattern)) {
      findings.push({
        file: rel,
        helper: match[1],
        index: match.index,
      });
    }
  }

  return findings;
}

function orderIncludeArchivedReachabilityFindings() {
  const findings = [];

  for (const filePath of walkFiles(srcRoot)) {
    const rel = relative(repoRoot, filePath);
    if (ORDER_INCLUDE_ARCHIVED_FILES.has(rel)) continue;

    const source = readFileSync(filePath, "utf8");
    const pattern = /\bincludeArchived\b/g;

    for (const match of source.matchAll(pattern)) {
      findings.push({
        file: rel,
        index: match.index,
      });
    }
  }

  return findings;
}

function orderIncludeRetiredLifecycleReachabilityFindings() {
  const findings = [];

  for (const filePath of walkFiles(srcRoot)) {
    const rel = relative(repoRoot, filePath);
    if (ORDER_INCLUDE_RETIRED_LIFECYCLE_FILES.has(rel)) continue;

    const source = readFileSync(filePath, "utf8");
    const pattern = /\bincludeRetiredLifecycle\b/g;

    for (const match of source.matchAll(pattern)) {
      findings.push({
        file: rel,
        index: match.index,
      });
    }
  }

  return findings;
}

describe("CRUD surface source scan", () => {
  it("keeps direct domain table writes confined to the documented compatibility watchlist", () => {
    const unapproved = directWriteFindings().filter((finding) => !WATCHLIST.has(finding.file));

    expect(unapproved).toEqual([]);
  });

  it("blocks direct frontend order deletes", () => {
    expect(orderDeleteFindings()).toEqual([]);
  });

  it("blocks direct frontend order archive mutations", () => {
    expect(directOrderArchiveFindings()).toEqual([]);
  });

  it("blocks direct frontend order status mutations", () => {
    expect(directOrderStatusMutationFindings()).toEqual([]);
  });

  it("blocks direct frontend order participant assignment mutations", () => {
    expect(directOrderAssignmentMutationFindings()).toEqual([]);
  });

  it("keeps legacy freeform status helpers confined to quarantine files", () => {
    expect(legacyOrderStatusHelperReachabilityFindings()).toEqual([]);
  });

  it("keeps legacy internal assignment helpers confined to quarantine files", () => {
    expect(legacyOrderAssignmentHelperReachabilityFindings()).toEqual([]);
  });

  it("keeps direct workflow transition RPC calls confined to the canonical service path", () => {
    expect(directWorkflowTransitionRpcFindings()).toEqual([]);
  });

  it("keeps deprecated order archive/delete helpers unreachable from active source files", () => {
    expect(orderRetirementHelperReachabilityFindings()).toEqual([]);
  });

  it("keeps the safe archive RPC wrapper confined to the approved internal detail surface", () => {
    expect(activeOrderArchiveRpcReachabilityFindings()).toEqual([]);
  });

  it("keeps cancel/void RPC wrappers confined to the approved internal detail surface", () => {
    expect(activeOrderCancelVoidRpcReachabilityFindings()).toEqual([]);
  });

  it("keeps includeArchived confined to low-level order read APIs", () => {
    expect(orderIncludeArchivedReachabilityFindings()).toEqual([]);
  });

  it("keeps includeRetiredLifecycle confined to low-level order read APIs", () => {
    expect(orderIncludeRetiredLifecycleReachabilityFindings()).toEqual([]);
  });

  it("documents the compatibility watchlist in the stabilization matrix", () => {
    const matrix = readFileSync(resolve(repoRoot, "docs/CRUD_STABILIZATION_MATRIX.md"), "utf8");

    for (const file of WATCHLIST) {
      expect(matrix).toContain(file);
    }
  });
});
