// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  OperationsModeProvider,
} from "@/lib/operations/OperationsModeProvider";
import { PERMISSIONS } from "@/lib/permissions/constants";

const VENDOR_WORKSPACE_VIEW = "vendor_workspace.view";

const sessionState = vi.hoisted(() => ({
  user: { id: "vendor-user-1" },
  isLoading: false,
}));

const permissionState = vi.hoisted(() => ({
  allowed: new Set(["vendor_workspace.view"]),
  loading: false,
  error: null,
  reload: vi.fn(),
}));

const supabaseMock = vi.hoisted(() => ({
  auth: {
    signOut: vi.fn(),
  },
}));

const apiMock = vi.hoisted(() => ({
  bootstrapVendorWorkspace: vi.fn(),
  createVendorWorkspaceAssignmentDocumentDownloadUrl: vi.fn(),
  createVendorWorkspaceDocumentDownloadUrl: vi.fn(),
  createVendorWorkspaceInvoiceUploadUrl: vi.fn(),
  createVendorWorkspaceReportUploadUrl: vi.fn(),
  declineVendorWorkspaceBidOpportunity: vi.fn(),
  fetchVendorWorkspaceAssignedOrderDetail: vi.fn(),
  fetchVendorWorkspaceAssignedOrders: vi.fn(),
  fetchVendorWorkspaceAvailableWorkDetail: vi.fn(),
  fetchVendorWorkspaceAvailableWork: vi.fn(),
  fetchVendorWorkspaceDashboardSummary: vi.fn(),
  fetchVendorWorkspaceMyBids: vi.fn(),
  fetchVendorWorkspacePayments: vi.fn(),
  fetchVendorWorkspaceProfile: vi.fn(),
  fetchVendorWorkspaceProfileUpdateRequests: vi.fn(),
  registerVendorWorkspaceInvoiceDocument: vi.fn(),
  registerVendorWorkspaceReportDocument: vi.fn(),
  resubmitVendorWorkspaceInvoice: vi.fn(),
  resubmitVendorWorkspaceReport: vi.fn(),
  startVendorWorkspaceAssignedOrder: vi.fn(),
  submitVendorWorkspaceBidResponse: vi.fn(),
  submitVendorWorkspaceProfileUpdateRequest: vi.fn(),
  submitVendorWorkspaceInvoice: vi.fn(),
  submitVendorWorkspaceReport: vi.fn(),
}));

vi.mock("@/lib/hooks/useSession", () => ({
  default: () => ({
    user: sessionState.user,
    userId: sessionState.user?.id ?? null,
    isLoading: sessionState.isLoading,
  }),
}));

vi.mock("@/lib/hooks/usePermissions", () => ({
  useEffectivePermissions: () => ({
    permissionKeys: [...permissionState.allowed],
    permissions: [...permissionState.allowed],
    loading: permissionState.loading,
    error: permissionState.error,
    hasPermission: (permissionKey) => permissionState.allowed.has(permissionKey),
    hasAnyPermission: (permissionKeys) =>
      Array.isArray(permissionKeys) &&
      permissionKeys.some((permissionKey) => permissionState.allowed.has(permissionKey)),
    hasAllPermissions: (permissionKeys) =>
      Array.isArray(permissionKeys) &&
      permissionKeys.every((permissionKey) => permissionState.allowed.has(permissionKey)),
    reload: permissionState.reload,
  }),
}));

vi.mock("@/lib/supabaseClient", () => ({
  default: supabaseMock,
}));

vi.mock("@/features/vendorWorkspace/api.js", () => apiMock);

const { default: VendorWorkspaceRouteGuard } = await import("@/routes/VendorWorkspaceRouteGuard");
const { default: ProtectedRoute } = await import("@/lib/hooks/ProtectedRoute");
const { default: DashboardGate } = await import("@/features/dashboard/DashboardGate.jsx");
const { default: VendorWorkspaceLayout } = await import("@/layout/VendorWorkspaceLayout");
const { default: VendorAssignedOrderDetailPage } = await import("../VendorAssignedOrderDetailPage.jsx");
const { default: VendorAssignedOrdersPage } = await import("../VendorAssignedOrdersPage.jsx");
const { default: VendorAvailableWorkDetailPage } = await import("../VendorAvailableWorkDetailPage.jsx");
const { default: VendorAvailableWorkPage } = await import("../VendorAvailableWorkPage.jsx");
const { default: VendorMyBidsPage } = await import("../VendorMyBidsPage.jsx");
const { default: VendorPaymentsPage } = await import("../VendorPaymentsPage.jsx");
const { default: VendorProfilePage } = await import("../VendorProfilePage.jsx");
const { default: VendorWorkspaceDashboard } = await import("../VendorWorkspaceDashboard.jsx");
const { default: VendorWorkspacePlaceholderPage } = await import("../VendorWorkspacePlaceholderPage.jsx");

const availableWorkDetailSource = readFileSync(
  resolve(process.cwd(), "src/features/vendorWorkspace/VendorAvailableWorkDetailPage.jsx"),
  "utf8",
);

const assignedOrdersSource = readFileSync(
  resolve(process.cwd(), "src/features/vendorWorkspace/VendorAssignedOrdersPage.jsx"),
  "utf8",
);

const assignedOrderDetailSource = readFileSync(
  resolve(process.cwd(), "src/features/vendorWorkspace/VendorAssignedOrderDetailPage.jsx"),
  "utf8",
);

const availableWorkSource = readFileSync(
  resolve(process.cwd(), "src/features/vendorWorkspace/VendorAvailableWorkPage.jsx"),
  "utf8",
);

const dashboardSource = readFileSync(
  resolve(process.cwd(), "src/features/vendorWorkspace/VendorWorkspaceDashboard.jsx"),
  "utf8",
);

const myBidsSource = readFileSync(
  resolve(process.cwd(), "src/features/vendorWorkspace/VendorMyBidsPage.jsx"),
  "utf8",
);

const paymentsSource = readFileSync(
  resolve(process.cwd(), "src/features/vendorWorkspace/VendorPaymentsPage.jsx"),
  "utf8",
);

const profileSource = readFileSync(
  resolve(process.cwd(), "src/features/vendorWorkspace/VendorProfilePage.jsx"),
  "utf8",
);

const dashboardSummary = Object.freeze({
  ok: true,
  counts: {
    available_work: 3,
    pending_bids: 2,
    assignment_offers: 1,
    active_assigned_orders: 4,
    submitted_awaiting_review: 5,
    needs_attention: 6,
  },
  actions: [
    {
      kind: "bid_request",
      priority: "due_soon",
      label: "Submit bid",
      due_at: "2026-06-05T14:30:00.000Z",
      order: {
        order_number: "AMC-DEMO-003",
        property_address: "123 Market Street",
        city: "Columbus",
        state: "OH",
        postal_code: "43215",
        county: "Franklin",
        property_type: "Office",
        report_type: "Commercial Appraisal",
      },
      owner: {
        company_name: "Continental AMC",
      },
    },
  ],
});

const availableWork = Object.freeze({
  ok: true,
  items: [
    {
      work_key: "opaque-work-key-1",
      status: "overdue",
      bid_due_at: "2026-06-04T14:00:00.000Z",
      requested_due_date: "2026-06-12T20:00:00.000Z",
      requested_turn_time_days: 8,
      order: {
        order_number: "AMC-DEMO-004",
        property_address: "456 Vendor Lane",
        city: "Detroit",
        state: "MI",
        postal_code: "48226",
        county: "Wayne",
        property_type: "Retail",
        report_type: "Commercial Appraisal",
      },
      owner: {
        company_name: "Continental AMC",
      },
      summary: {
        scope: "Exterior review requested.",
        complexity: ["Income approach"],
        documents_available: 2,
      },
    },
  ],
});

const availableWorkDetail = Object.freeze({
  ok: true,
  item: {
    work_key: "opaque-work-key-1",
    status: "due_soon",
    bid_due_at: "2026-06-05T14:00:00.000Z",
    requested_due_date: "2026-06-12T20:00:00.000Z",
    requested_turn_time_days: 8,
    instructions: "Confirm availability before bidding.",
    order: {
      order_number: "AMC-DEMO-004",
      property_address: "456 Vendor Lane",
      city: "Detroit",
      state: "MI",
      postal_code: "48226",
      county: "Wayne",
      property_type: "Retail",
      report_type: "Commercial Appraisal",
    },
    owner: {
      company_name: "Continental AMC",
    },
    summary: {
      scope: "Exterior review requested.",
      complexity: [],
      documents_available: 1,
    },
    documents: [
      {
        document_key: "a".repeat(64),
        category: "source_documents",
        title: "Engagement Letter",
        file_name: "engagement-letter.pdf",
        mime_type: "application/pdf",
        file_size: 2048,
        created_at: "2026-06-04T16:00:00.000Z",
      },
    ],
  },
});

const submittedWorkDetail = Object.freeze({
  ok: true,
  item: {
    ...availableWorkDetail.item,
    work_key: "submitted-work-key",
    status: "submitted",
    bid: {
      status: "submitted",
      fee_amount: 1450,
      currency: "USD",
      turn_time_days: 8,
      proposed_due_at: "2026-06-12T20:00:00.000Z",
      comments: "Available next week.",
      submitted_at: "2026-06-04T18:00:00.000Z",
    },
  },
});

const declinedWorkDetail = Object.freeze({
  ok: true,
  item: {
    ...availableWorkDetail.item,
    work_key: "passed-work-key",
    status: "declined",
    order: {
      ...availableWorkDetail.item.order,
      order_number: "AMC-DEMO-005",
      property_address: "789 Passed Road",
    },
    decline: {
      status: "declined",
      reason: "Too busy / capacity",
      comments: "At capacity next week.",
      declined_at: "2026-06-04T18:30:00.000Z",
    },
  },
});

const expiredWorkDetail = Object.freeze({
  ok: true,
  item: {
    ...availableWorkDetail.item,
    work_key: "expired-work-key",
    status: "expired",
    expired_at: "2026-06-07T14:00:00.000Z",
    order: {
      ...availableWorkDetail.item.order,
      order_number: "AMC-DEMO-007",
      property_address: "321 Expired Blvd",
    },
  },
});

const selectedWorkDetail = Object.freeze({
  ok: true,
  item: {
    ...availableWorkDetail.item,
    work_key: "selected-work-key",
    status: "selected",
    selection_outcome: "selected",
    order: {
      ...availableWorkDetail.item.order,
      order_number: "AMC-DEMO-006",
      property_address: "123 Selected Ave",
    },
    bid: {
      status: "submitted",
      fee_amount: 1800,
      currency: "USD",
      submitted_at: "2026-06-04T19:00:00.000Z",
    },
  },
});

const notSelectedWorkDetail = Object.freeze({
  ok: true,
  item: {
    ...availableWorkDetail.item,
    work_key: "not-selected-work-key",
    status: "not_selected",
    selection_outcome: "not_selected",
    order: {
      ...availableWorkDetail.item.order,
      order_number: "AMC-DEMO-008",
      property_address: "654 Not Selected Drive",
    },
    bid: {
      status: "submitted",
      fee_amount: 1200,
      currency: "USD",
      submitted_at: "2026-06-04T20:00:00.000Z",
    },
  },
});

const myBids = Object.freeze({
  ok: true,
  items: [
    {
      work_key: "submitted-work-key",
      bid_status: "submitted",
      submitted_at: "2026-06-04T18:00:00.000Z",
      bid_due_at: "2026-06-05T14:00:00.000Z",
      requested_due_date: "2026-06-12T20:00:00.000Z",
      order: {
        order_number: "AMC-DEMO-004",
        property_address: "456 Vendor Lane",
        city: "Detroit",
        state: "MI",
        postal_code: "48226",
        county: "Wayne",
        property_type: "Retail",
        report_type: "Commercial Appraisal",
      },
      owner: {
        company_name: "Continental AMC",
      },
      bid: {
        fee_amount: 1450,
        currency: "USD",
        turn_time_days: 8,
        proposed_due_at: "2026-06-12T20:00:00.000Z",
        comments: "Available next week.",
      },
    },
    {
      work_key: "passed-work-key",
      bid_status: "passed",
      declined_at: "2026-06-04T18:30:00.000Z",
      bid_due_at: "2026-06-05T14:00:00.000Z",
      requested_due_date: "2026-06-12T20:00:00.000Z",
      order: {
        order_number: "AMC-DEMO-005",
        property_address: "789 Passed Road",
        city: "Toledo",
        state: "OH",
        postal_code: "43604",
        county: "Lucas",
        property_type: "Office",
        report_type: "Commercial Review",
      },
      owner: {
        company_name: "Continental AMC",
      },
      decline: {
        reason: "Too busy / capacity",
        comments: "At capacity next week.",
      },
    },
    {
      work_key: "selected-work-key",
      bid_status: "selected",
      selection_outcome: "selected",
      submitted_at: "2026-06-04T19:00:00.000Z",
      bid_due_at: "2026-06-06T14:00:00.000Z",
      requested_due_date: "2026-06-14T20:00:00.000Z",
      order: {
        order_number: "AMC-DEMO-006",
        property_address: "123 Selected Ave",
        city: "Indianapolis",
        state: "IN",
        postal_code: "46204",
        county: "Marion",
        property_type: "Industrial",
        report_type: "Commercial Appraisal",
      },
      owner: {
        company_name: "Continental AMC",
      },
      bid: {
        fee_amount: 1800,
        currency: "USD",
      },
    },
    {
      work_key: "expired-work-key",
      bid_status: "expired",
      expired_at: "2026-06-07T14:00:00.000Z",
      bid_due_at: "2026-06-07T14:00:00.000Z",
      requested_due_date: "2026-06-15T20:00:00.000Z",
      order: {
        order_number: "AMC-DEMO-007",
        property_address: "321 Expired Blvd",
        city: "Grand Rapids",
        state: "MI",
        postal_code: "49503",
        county: "Kent",
        property_type: "Mixed Use",
        report_type: "Commercial Appraisal",
      },
      owner: {
        company_name: "Continental AMC",
      },
    },
  ],
});

const vendorProfile = Object.freeze({
  ok: true,
  profile: {
    company: {
      name: "Field Partner Valuation",
      public_phone: "614-555-0100",
      website: "https://fieldpartner.example",
    },
    status: {
      vendor_status: "active",
      relationship_status: "active",
      is_active: true,
    },
    primary_contact: {
      name: "Jordan Vendor",
      email: "jordan@example.com",
      phone: "614-555-0101",
      role_label: "Operations",
    },
    contacts: [
      {
        name: "Jordan Vendor",
        email: "jordan@example.com",
        phone: "614-555-0101",
        role_label: "Operations",
        is_primary: true,
      },
    ],
    coverage: {
      row_count: 2,
      states: ["OH", "MI"],
      counties: [{ state: "OH", county: "Franklin" }],
      markets: ["Columbus"],
      service_areas: [
        {
          state: "OH",
          county: "Franklin",
          product_type: "commercial",
          radius_miles: 25,
        },
      ],
    },
    accepted_work_types: {
      product_types: ["commercial"],
      property_types: ["Office", "Retail"],
      report_types: ["Commercial Appraisal"],
    },
    default_turn_time_days: 7,
    compliance: {
      status: "Approved",
      insurance_status: "Current",
      license_status: "Current",
      document_count: 0,
      last_updated_at: "2026-06-05T12:00:00.000Z",
    },
    last_updated_at: "2026-06-05T12:00:00.000Z",
  },
});

const vendorProfileUpdateRequests = Object.freeze({
  ok: true,
  requests: [
    {
      request_key: "opaque-profile-request-key",
      status: "pending",
      submitted_at: "2026-06-05T14:00:00.000Z",
      updated_at: "2026-06-05T14:00:00.000Z",
      reviewed_at: null,
      proposed_changes: {
        comments: "Please add Delaware County coverage.",
        coverage_changes: { counties: ["Delaware, OH"] },
      },
    },
  ],
});

const payments = Object.freeze({
  ok: true,
  items: [
    {
      payment_key: "opaque-payment-key-1",
      assignment_work_key: "assigned-work-key-1",
      assignment_status: "completed",
      assignment_completed_at: "2026-06-08T18:00:00.000Z",
      accepted_at: "2026-06-05T14:00:00.000Z",
      vendor_fee_amount: 1250,
      currency: "USD",
      invoice_status: "Ready for Invoice",
      payment_status: "Ready for Invoice",
      payment_status_key: "ready_for_invoice",
      payment_date: null,
      payment_reference_label: null,
      next_action_label: "Invoice submission coming later",
      order: {
        order_number: "AMC-DEMO-003",
        property_address: "987 Assigned Way",
        city: "Columbus",
        state: "OH",
        postal_code: "43215",
        county: "Franklin",
        property_type: "Office",
        report_type: "Commercial Appraisal",
      },
      owner: {
        company_name: "Continental AMC",
      },
    },
    {
      payment_key: "opaque-payment-key-2",
      assignment_work_key: "paid-assigned-work-key",
      assignment_status: "completed",
      assignment_completed_at: "2026-06-01T18:00:00.000Z",
      vendor_fee_amount: 950,
      currency: "USD",
      invoice_status: "Approved",
      payment_status: "Paid",
      payment_status_key: "paid",
      payment_date: "2026-06-10",
      payment_method_label: "ACH",
      payment_reference_label: "ACH ending 1234",
      vendor_payment_note: "Payment was sent by ACH.",
      next_action_label: "Paid",
      order: {
        order_number: "AMC-DEMO-002",
        property_address: "123 Paid Lane",
        city: "Detroit",
        state: "MI",
        postal_code: "48226",
        property_type: "Retail",
        report_type: "Commercial Appraisal",
      },
      owner: {
        company_name: "Continental AMC",
      },
    },
    {
      payment_key: "opaque-payment-key-4",
      assignment_work_key: "received-assigned-work-key",
      assignment_status: "completed",
      assignment_completed_at: "2026-06-02T18:00:00.000Z",
      vendor_fee_amount: 1000,
      currency: "USD",
      invoice_status: "Invoice Received",
      payment_status: "Invoice Received",
      payment_status_key: "invoice_received",
      payment_date: null,
      payment_reference_label: null,
      next_action_label: "Awaiting payment review",
      order: {
        order_number: "AMC-DEMO-005",
        property_address: "111 Received Row",
        city: "Columbus",
        state: "OH",
        postal_code: "43215",
        property_type: "Office",
        report_type: "Commercial Appraisal",
      },
      owner: {
        company_name: "Continental AMC",
      },
    },
    {
      payment_key: "opaque-payment-key-5",
      assignment_work_key: "approved-assigned-work-key",
      assignment_status: "completed",
      assignment_completed_at: "2026-06-02T18:00:00.000Z",
      vendor_fee_amount: 1000,
      currency: "USD",
      invoice_status: "Approved",
      payment_status: "Approved",
      payment_status_key: "approved",
      payment_date: null,
      payment_reference_label: null,
      next_action_label: "Awaiting payment scheduling",
      order: {
        order_number: "AMC-DEMO-006",
        property_address: "222 Approved Row",
        city: "Columbus",
        state: "OH",
        postal_code: "43215",
        property_type: "Office",
        report_type: "Commercial Appraisal",
      },
      owner: {
        company_name: "Continental AMC",
      },
    },
    {
      payment_key: "opaque-payment-key-6",
      assignment_work_key: "scheduled-assigned-work-key",
      assignment_status: "completed",
      assignment_completed_at: "2026-06-02T18:00:00.000Z",
      vendor_fee_amount: 1000,
      currency: "USD",
      invoice_status: "Approved",
      payment_status: "Scheduled",
      payment_status_key: "scheduled",
      payment_date: "2026-06-15",
      payment_method_label: "Check",
      payment_reference_label: "Check run 42",
      vendor_payment_note: "Payment is scheduled for the next check run.",
      next_action_label: "Payment scheduled",
      order: {
        order_number: "AMC-DEMO-007",
        property_address: "333 Scheduled Row",
        city: "Columbus",
        state: "OH",
        postal_code: "43215",
        property_type: "Office",
        report_type: "Commercial Appraisal",
      },
      owner: {
        company_name: "Continental AMC",
      },
    },
    {
      payment_key: "opaque-payment-key-7",
      assignment_work_key: "hold-assigned-work-key",
      assignment_status: "completed",
      assignment_completed_at: "2026-06-02T18:00:00.000Z",
      vendor_fee_amount: 1000,
      currency: "USD",
      invoice_status: "On Hold",
      payment_status: "On Hold",
      payment_status_key: "on_hold",
      payment_date: null,
      payment_reference_label: null,
      next_action_label: "Contact AMC coordinator",
      order: {
        order_number: "AMC-DEMO-008",
        property_address: "444 Hold Row",
        city: "Columbus",
        state: "OH",
        postal_code: "43215",
        property_type: "Office",
        report_type: "Commercial Appraisal",
      },
      owner: {
        company_name: "Continental AMC",
      },
    },
    {
      payment_key: "opaque-payment-key-3",
      assignment_work_key: "rejected-assigned-work-key",
      assignment_status: "completed",
      assignment_completed_at: "2026-06-03T18:00:00.000Z",
      vendor_fee_amount: 1100,
      currency: "USD",
      invoice_status: "Rejected",
      payment_status: "Rejected",
      payment_status_key: "rejected",
      payment_date: null,
      payment_reference_label: null,
      next_action_label: "Submit a corrected invoice if requested",
      invoice: {
        invoice_number: "INV-0999",
        invoice_amount: 1200,
        currency: "USD",
        submitted_at: "2026-06-04T14:00:00.000Z",
        review: {
          decision: "reject",
          status: "rejected",
          reviewed_at: "2026-06-05T14:00:00.000Z",
          vendor_message: "Please correct the invoice amount and upload a revised PDF.",
        },
      },
      order: {
        order_number: "AMC-DEMO-004",
        property_address: "456 Rejected Road",
        city: "Indianapolis",
        state: "IN",
        postal_code: "46204",
        property_type: "Office",
        report_type: "Commercial Appraisal",
      },
      owner: {
        company_name: "Continental AMC",
      },
    },
  ],
});

const assignedOrders = Object.freeze({
  ok: true,
  items: [
    {
      assignment_work_key: "assigned-work-key-1",
      work_key: "assigned-work-key-1",
      assignment_status: "accepted_not_started",
      status_label: "Accepted",
      accepted_at: "2026-06-04T18:00:00.000Z",
      due_at: "2026-06-06T20:00:00.000Z",
      inspection_status: null,
      report_submitted: false,
      next_action_label: "Start Work",
      needs_attention: true,
      order: {
        order_number: "AMC-DEMO-009",
        property_address: "987 Assigned Way",
        city: "Cleveland",
        state: "OH",
        postal_code: "44114",
        county: "Cuyahoga",
        property_type: "Multifamily",
        report_type: "Commercial Appraisal",
      },
      owner: {
        company_name: "Continental AMC",
      },
    },
    {
      assignment_work_key: "submitted-assigned-work-key",
      work_key: "submitted-assigned-work-key",
      assignment_status: "report_submitted",
      status_label: "Submitted / Awaiting Review",
      accepted_at: "2026-06-01T18:00:00.000Z",
      due_at: "2026-06-08T20:00:00.000Z",
      inspection_status: "Inspection Scheduled",
      report_submitted: true,
      next_action_label: "Awaiting Review",
      needs_attention: false,
      order: {
        order_number: "AMC-DEMO-010",
        property_address: "246 Submitted Street",
        city: "Ann Arbor",
        state: "MI",
        postal_code: "48104",
        county: "Washtenaw",
        property_type: "Office",
        report_type: "Commercial Review",
      },
      owner: {
        company_name: "Continental AMC",
      },
    },
  ],
});

const assignedOrderDetail = Object.freeze({
  ok: true,
  item: {
    ...assignedOrders.items[0],
    review_due_at: null,
    started_at: null,
    submitted_at: null,
    completed_at: null,
    summary: {
      scope: "Complete the commercial appraisal according to the engagement scope.",
      documents_available: 1,
    },
    instructions: "Confirm inspection timing with property contact before starting work.",
    timeline: {
      accepted_at: "2026-06-04T18:00:00.000Z",
      started_at: null,
      submitted_at: null,
      completed_at: null,
    },
    report_submission: {
      status: "not_submitted",
      submitted_at: null,
      note: null,
    },
    revision: null,
    documents: [
      {
        document_key: "b".repeat(64),
        category: "source_documents",
        title: "Assignment Engagement",
        file_name: "assignment-engagement.pdf",
        mime_type: "application/pdf",
        file_size: 4096,
        created_at: "2026-06-04T16:00:00.000Z",
      },
    ],
  },
});

const submittedAssignedOrderDetail = Object.freeze({
  ok: true,
  item: {
    ...assignedOrderDetail.item,
    assignment_work_key: "submitted-assigned-work-key",
    assignment_status: "report_submitted",
    status_label: "Submitted / Awaiting Review",
    next_action_label: "Awaiting Review",
    report_submitted: true,
    submitted_at: "2026-06-06T20:00:00.000Z",
    report_submission: {
      status: "submitted",
      submitted_at: "2026-06-06T20:00:00.000Z",
      note: "Report package submitted for AMC review.",
    },
    order: {
      ...assignedOrderDetail.item.order,
      order_number: "AMC-DEMO-010",
      property_address: "246 Submitted Street",
    },
  },
});

const resubmittedAssignedOrderDetail = Object.freeze({
  ok: true,
  item: {
    ...submittedAssignedOrderDetail.item,
    assignment_status: "resubmitted_awaiting_review",
    status_label: "Resubmitted / Awaiting Review",
    report_submission: {
      status: "resubmitted",
      submitted_at: "2026-06-05T15:00:00.000Z",
      resubmitted_at: "2026-06-05T15:00:00.000Z",
      note: "Revision complete.",
      document_count: 1,
    },
  },
});

const inProgressAssignedOrderDetail = Object.freeze({
  ok: true,
  item: {
    ...assignedOrderDetail.item,
    assignment_status: "in_progress",
    status_label: "In Progress",
    next_action_label: "Submit Report",
    started_at: "2026-06-04T22:30:00.000Z",
    timeline: {
      ...assignedOrderDetail.item.timeline,
      started_at: "2026-06-04T22:30:00.000Z",
    },
    needs_attention: false,
  },
});

const revisionRequestedAssignedOrderDetail = Object.freeze({
  ok: true,
  item: {
    ...assignedOrderDetail.item,
    assignment_status: "revision_requested",
    status_label: "Revision Requested",
    next_action_label: "Review Revision Request",
    submitted_at: "2026-06-06T20:00:00.000Z",
    review_due_at: "2026-06-08T20:00:00.000Z",
    report_submitted: false,
    needs_attention: true,
    report_submission: {
      status: "submitted",
      submitted_at: "2026-06-06T20:00:00.000Z",
      note: "Report package submitted for AMC review.",
      document_count: 1,
    },
    revision: {
      status: "revision_requested",
      requested_at: "2026-06-07T14:00:00.000Z",
      requested_by_label: "Continental AMC",
      due_at: "2026-06-08T20:00:00.000Z",
      summary: "Please address the income approach comments.",
      instructions: "Update the rent comparable discussion and resubmit the corrected report.",
      prior_submission: {
        submitted_at: "2026-06-06T20:00:00.000Z",
        note: "Report package submitted for AMC review.",
        document_count: 1,
      },
    },
  },
});

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderVendorWorkspace(path = "/vendor-workspace/dashboard") {
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <Routes>
        <Route
          element={
            <VendorWorkspaceRouteGuard>
              <VendorWorkspaceLayout />
            </VendorWorkspaceRouteGuard>
          }
        >
          <Route path="/vendor-workspace/dashboard" element={<VendorWorkspaceDashboard />} />
          <Route path="/vendor-workspace/available-work" element={<VendorAvailableWorkPage />} />
          <Route path="/vendor-workspace/my-bids" element={<VendorMyBidsPage />} />
          <Route path="/vendor-workspace/payments" element={<VendorPaymentsPage />} />
          <Route path="/vendor-workspace/profile" element={<VendorProfilePage />} />
          <Route
            path="/vendor-workspace/historical-assignments"
            element={<VendorWorkspacePlaceholderPage page="historicalAssignments" />}
          />
          <Route path="/vendor-workspace/documents" element={<VendorWorkspacePlaceholderPage page="documents" />} />
          <Route path="/vendor-workspace/credentials" element={<VendorWorkspacePlaceholderPage page="credentials" />} />
          <Route path="/vendor-workspace/assigned-orders" element={<VendorAssignedOrdersPage />} />
          <Route
            path="/vendor-workspace/assigned-orders/:assignmentWorkKey"
            element={<VendorAssignedOrderDetailPage />}
          />
          <Route
            path="/vendor-workspace/available-work/:workKey"
            element={<VendorAvailableWorkDetailPage />}
          />
        </Route>
        <Route path="/login" element={<LocationProbe />} />
        <Route path="/dashboard" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

function InternalOrdersMarker() {
  return <div data-testid="internal-orders-data">Internal / AMC orders data</div>;
}

function InternalOrderDetailMarker() {
  return <div data-testid="internal-order-detail-data">Internal / AMC order detail data</div>;
}

function renderVendorRouteIsolation(path) {
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_relativeSplatPath: true, v7_startTransition: true }}
    >
      <OperationsModeProvider>
        <Routes>
          <Route
            element={
              <VendorWorkspaceRouteGuard>
                <VendorWorkspaceLayout />
              </VendorWorkspaceRouteGuard>
            }
          >
            <Route path="/vendor-workspace/dashboard" element={<VendorWorkspaceDashboard />} />
          </Route>
          <Route
            path="/orders"
            element={
              <ProtectedRoute
                requiredAnyPermissions={[
                  PERMISSIONS.ORDERS_READ_ALL,
                  PERMISSIONS.ORDERS_READ_ASSIGNED,
                ]}
              >
                <InternalOrdersMarker />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute
                requiredAnyPermissions={[
                  PERMISSIONS.ORDERS_READ_ALL,
                  PERMISSIONS.ORDERS_READ_ASSIGNED,
                ]}
              >
                <InternalOrderDetailMarker />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <>
                  <LocationProbe />
                  <DashboardGate />
                </>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<LocationProbe />} />
        </Routes>
      </OperationsModeProvider>
    </MemoryRouter>,
  );
}

describe("Vendor Workspace hidden shell", () => {
  beforeEach(() => {
    vi.spyOn(window, "open").mockImplementation(() => null);
    sessionState.user = { id: "vendor-user-1", email: "chris@therossicompany.com" };
    sessionState.isLoading = false;
    supabaseMock.auth.signOut.mockReset();
    supabaseMock.auth.signOut.mockResolvedValue({ error: null });
    permissionState.allowed = new Set([VENDOR_WORKSPACE_VIEW]);
    permissionState.loading = false;
    permissionState.error = null;
    permissionState.reload.mockReset();
    permissionState.reload.mockResolvedValue();
    apiMock.bootstrapVendorWorkspace.mockReset();
    apiMock.bootstrapVendorWorkspace.mockResolvedValue({
      ok: true,
      vendor_company_id: "vendor-company-1",
      vendor_company_name: "Acme Appraisal",
    });
    apiMock.fetchVendorWorkspaceAvailableWorkDetail.mockReset();
    apiMock.fetchVendorWorkspaceAvailableWorkDetail.mockResolvedValue(availableWorkDetail);
    apiMock.fetchVendorWorkspaceAvailableWork.mockReset();
    apiMock.fetchVendorWorkspaceAvailableWork.mockResolvedValue(availableWork);
    apiMock.fetchVendorWorkspaceDashboardSummary.mockReset();
    apiMock.fetchVendorWorkspaceDashboardSummary.mockResolvedValue(dashboardSummary);
    apiMock.fetchVendorWorkspaceMyBids.mockReset();
    apiMock.fetchVendorWorkspaceMyBids.mockResolvedValue(myBids);
    apiMock.fetchVendorWorkspacePayments.mockReset();
    apiMock.fetchVendorWorkspacePayments.mockResolvedValue(payments);
    apiMock.createVendorWorkspaceInvoiceUploadUrl.mockReset();
    apiMock.createVendorWorkspaceInvoiceUploadUrl.mockResolvedValue({
      ok: true,
      document: {
        document_key: "i".repeat(64),
        file_name: "invoice.pdf",
        mime_type: "application/pdf",
        file_size: 1024,
      },
      upload: {
        signed_url: "https://example.test/vendor-invoice-upload",
        token: "signed-token",
      },
    });
    apiMock.registerVendorWorkspaceInvoiceDocument.mockReset();
    apiMock.registerVendorWorkspaceInvoiceDocument.mockResolvedValue({
      ok: true,
      document: {
        document_key: "i".repeat(64),
        file_name: "invoice.pdf",
        mime_type: "application/pdf",
        file_size: 1024,
      },
      field_errors: {},
    });
    apiMock.submitVendorWorkspaceInvoice.mockReset();
    apiMock.submitVendorWorkspaceInvoice.mockResolvedValue({
      ok: true,
      status: "invoice_received",
      message: "Invoice submitted.",
      invoice: {
        invoice_number: "INV-1001",
        invoice_amount: 1250,
        currency: "USD",
      },
      field_errors: {},
    });
    apiMock.resubmitVendorWorkspaceInvoice.mockReset();
    apiMock.resubmitVendorWorkspaceInvoice.mockResolvedValue({
      ok: true,
      status: "invoice_received",
      message: "Corrected invoice submitted.",
      invoice: {
        invoice_number: "INV-0999-R",
        invoice_amount: 1100,
        currency: "USD",
      },
      field_errors: {},
    });
    apiMock.fetchVendorWorkspaceProfile.mockReset();
    apiMock.fetchVendorWorkspaceProfile.mockResolvedValue(vendorProfile);
    apiMock.fetchVendorWorkspaceProfileUpdateRequests.mockReset();
    apiMock.fetchVendorWorkspaceProfileUpdateRequests.mockResolvedValue(vendorProfileUpdateRequests);
    apiMock.submitVendorWorkspaceProfileUpdateRequest.mockReset();
    apiMock.submitVendorWorkspaceProfileUpdateRequest.mockResolvedValue({
      ok: true,
      request: {
        request_key: "new-opaque-profile-request-key",
        status: "pending",
        submitted_at: "2026-06-05T15:00:00.000Z",
        proposed_changes: {
          comments: "Please update contact details.",
        },
      },
      field_errors: {},
    });
    apiMock.fetchVendorWorkspaceAssignedOrders.mockReset();
    apiMock.fetchVendorWorkspaceAssignedOrders.mockResolvedValue(assignedOrders);
    apiMock.fetchVendorWorkspaceAssignedOrderDetail.mockReset();
    apiMock.fetchVendorWorkspaceAssignedOrderDetail.mockResolvedValue(assignedOrderDetail);
    apiMock.startVendorWorkspaceAssignedOrder.mockReset();
    apiMock.startVendorWorkspaceAssignedOrder.mockResolvedValue({
      ok: true,
      status: "in_progress",
      message: "Work started.",
      started_at: "2026-06-04T22:30:00.000Z",
      field_errors: {},
    });
    apiMock.submitVendorWorkspaceReport.mockReset();
    apiMock.submitVendorWorkspaceReport.mockResolvedValue({
      ok: true,
      status: "submitted",
      message: "Report submitted.",
      submitted_at: "2026-06-04T23:30:00.000Z",
      field_errors: {},
    });
    apiMock.createVendorWorkspaceReportUploadUrl.mockReset();
    apiMock.createVendorWorkspaceReportUploadUrl.mockResolvedValue({
      ok: true,
      document: {
        document_key: "d".repeat(64),
        file_name: "report.pdf",
        mime_type: "application/pdf",
        file_size: 1024,
      },
      upload: {
        signed_url: "https://example.test/vendor-report-upload",
        token: "signed-token",
      },
    });
    apiMock.registerVendorWorkspaceReportDocument.mockReset();
    apiMock.registerVendorWorkspaceReportDocument.mockResolvedValue({
      ok: true,
      document: {
        document_key: "d".repeat(64),
        file_name: "report.pdf",
        mime_type: "application/pdf",
        file_size: 1024,
      },
      field_errors: {},
    });
    apiMock.resubmitVendorWorkspaceReport.mockReset();
    apiMock.resubmitVendorWorkspaceReport.mockResolvedValue({
      ok: true,
      status: "submitted",
      message: "Report resubmitted.",
      resubmitted_at: "2026-06-05T15:00:00.000Z",
      submitted_at: "2026-06-05T15:00:00.000Z",
      field_errors: {},
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
      }),
    );
    apiMock.createVendorWorkspaceDocumentDownloadUrl.mockReset();
    apiMock.createVendorWorkspaceDocumentDownloadUrl.mockResolvedValue({
      ok: true,
      signed_url: "https://example.test/vendor-signed-download",
      expires_in: 300,
      document: {
        document_key: "a".repeat(64),
        file_name: "engagement-letter.pdf",
      },
    });
    apiMock.createVendorWorkspaceAssignmentDocumentDownloadUrl.mockReset();
    apiMock.createVendorWorkspaceAssignmentDocumentDownloadUrl.mockResolvedValue({
      ok: true,
      signed_url: "https://example.test/vendor-assignment-signed-download",
      expires_in: 300,
      document: {
        document_key: "b".repeat(64),
        file_name: "assignment-engagement.pdf",
      },
    });
    apiMock.submitVendorWorkspaceBidResponse.mockReset();
    apiMock.submitVendorWorkspaceBidResponse.mockResolvedValue({
      ok: true,
      status: "bid_submitted",
      submitted_at: "2026-06-04T18:00:00.000Z",
      bid: {
        status: "submitted",
        fee_amount: 1450,
        currency: "USD",
        turn_time_days: 8,
        comments: "Available next week.",
        submitted_at: "2026-06-04T18:00:00.000Z",
      },
      field_errors: {},
    });
    apiMock.declineVendorWorkspaceBidOpportunity.mockReset();
    apiMock.declineVendorWorkspaceBidOpportunity.mockResolvedValue({
      ok: true,
      status: "declined",
      declined_at: "2026-06-04T18:30:00.000Z",
      decline: {
        status: "declined",
        reason: "Too busy / capacity",
        comments: "At capacity next week.",
        declined_at: "2026-06-04T18:30:00.000Z",
      },
      field_errors: {},
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the hidden Vendor Workspace dashboard for vendor workspace permission", async () => {
    const { container } = renderVendorWorkspace();

    expect(await screen.findByRole("heading", { name: "Your work queue" })).toBeInTheDocument();
    expect(
      screen.getByText(
        "Review available opportunities, manage active assignments, track due dates, and follow payment status from one vendor-facing workspace.",
      ),
    ).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Next actions" })).toBeInTheDocument();
    expect(apiMock.fetchVendorWorkspaceDashboardSummary).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText("Available Work / Bids").length).toBeGreaterThan(0);
    expect(screen.getByText("Submitted Bids")).toBeInTheDocument();
    expect(screen.getByText("Assignment Offers")).toBeInTheDocument();
    expect(screen.getAllByText("Assignments").length).toBeGreaterThan(0);
    expect(screen.getByText("Submitted / Awaiting Review")).toBeInTheDocument();
    expect(screen.getByText("Needs Attention")).toBeInTheDocument();
    expect(container.querySelector('[data-testid="operations-mode-switcher"]')).toBeNull();
    expect(screen.queryByText("Operations Command")).toBeNull();
    expect(screen.getByRole("navigation", { name: "Vendor workspace sections" })).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Vendor workspace mobile sections" })).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "Falcon" })).toHaveLength(2);
    expect(screen.getByText("Assignments, coverage, and credentials")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Dashboard" })[0]).toHaveAttribute(
      "href",
      "/vendor-workspace/dashboard",
    );
    expect(screen.getAllByRole("link", { name: "Current Assignments" })[0]).toHaveAttribute(
      "href",
      "/vendor-workspace/assigned-orders",
    );
    expect(screen.getAllByRole("link", { name: "Historical Assignments" })[0]).toHaveAttribute(
      "href",
      "/vendor-workspace/historical-assignments",
    );
    expect(screen.getAllByRole("link", { name: "Documents" })[0]).toHaveAttribute(
      "href",
      "/vendor-workspace/documents",
    );
    expect(screen.getAllByRole("link", { name: "Credentials" })[0]).toHaveAttribute(
      "href",
      "/vendor-workspace/credentials",
    );
    expect(screen.getAllByRole("link", { name: "Coverage/Profile" })[0]).toHaveAttribute(
      "href",
      "/vendor-workspace/profile",
    );
    expect(screen.queryByRole("link", { name: "Client Portal" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Internal Operations" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Falcon AMC" })).toBeNull();
    expect(screen.queryByText("Open Workspace")).toBeNull();
  });

  it("shows the signed-in vendor email and signs out from the Vendor Workspace shell", async () => {
    renderVendorWorkspace("/vendor-workspace/assigned-orders");

    expect(await screen.findByRole("heading", { name: "Assignments" })).toBeInTheDocument();
    expect(screen.getByText("chris@therossicompany.com")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sign Out" }));

    await waitFor(() => {
      expect(supabaseMock.auth.signOut).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId("location")).toHaveTextContent("/login");
    });
  });

  it("renders dashboard counts and safe action summary fields", async () => {
    const { container } = renderVendorWorkspace();

    expect((await screen.findAllByText("Submit bid")).length).toBeGreaterThan(0);
    ["3", "2", "1", "4", "5", "6"].forEach((count) => {
      expect(screen.getAllByText(count).length).toBeGreaterThan(0);
    });
    expect(screen.getByText("AMC-DEMO-003")).toBeInTheDocument();
    expect(screen.getByText("123 Market Street, Columbus, OH, 43215")).toBeInTheDocument();
    expect(screen.getByText("Commercial Appraisal")).toBeInTheDocument();
    expect(screen.getByText("Office")).toBeInTheDocument();
    expect(screen.getByText("Continental AMC")).toBeInTheDocument();
    expect(screen.getByText("Due soon")).toBeInTheDocument();

    [
      "order-id-1",
      "relationship-id-1",
      "vendor-profile-id-1",
      "bid-request-id-1",
      "recipient-id-1",
      "response-id-1",
      "candidate_snapshot",
      "handoff_payload",
    ].forEach((hiddenText) => {
      expect(screen.queryByText(hiddenText)).toBeNull();
    });

    expect(container.querySelector('a[href^="/orders"]')).toBeNull();
    expect(container.querySelector('a[href^="/vendors"]')).toBeNull();
    expect(container.querySelector('a[href^="/clients"]')).toBeNull();
    expect(screen.getAllByRole("link", { name: "Current Assignments" })[0]).toHaveAttribute(
      "href",
      "/vendor-workspace/assigned-orders",
    );
    expect(screen.queryByRole("link", { name: "Client Portal" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Internal Operations" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Falcon AMC" })).toBeNull();
    expect(container.querySelector('a[href="/vendor-workspace/assigned-orders"]')).not.toBeNull();
  });

  it("renders the read-only available work page from the vendor-scoped RPC", async () => {
    const { container } = renderVendorWorkspace("/vendor-workspace/available-work");

    expect(await screen.findByRole("heading", { name: "Available Work" })).toBeInTheDocument();
    expect(apiMock.fetchVendorWorkspaceAvailableWork).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("456 Vendor Lane")).toBeInTheDocument();
    expect(screen.getByText("Detroit, MI, 48226")).toBeInTheDocument();
    expect(screen.getByText("AMC-DEMO-004")).toBeInTheDocument();
    expect(screen.getByText("Retail")).toBeInTheDocument();
    expect(screen.getByText("Commercial Appraisal")).toBeInTheDocument();
    expect(screen.getByText("Wayne")).toBeInTheDocument();
    expect(screen.getByText("Continental AMC")).toBeInTheDocument();
    expect(screen.getByText("Overdue")).toBeInTheDocument();
    expect(screen.getByText("8 days")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Exterior review requested.")).toBeInTheDocument();
    expect(screen.getByText("Income approach")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Work Detail" })).toHaveAttribute(
      "href",
      "/vendor-workspace/available-work/opaque-work-key-1",
    );

    [
      "order-id-1",
      "relationship-id-1",
      "vendor-profile-id-1",
      "bid-request-id-1",
      "recipient-id-1",
      "response-id-1",
      "candidate_snapshot",
      "handoff_payload",
      "opaque-work-key-1",
    ].forEach((hiddenText) => {
      expect(screen.queryByText(hiddenText)).toBeNull();
    });

    expect(container.querySelector('a[href^="/orders"]')).toBeNull();
    expect(container.querySelector('a[href^="/vendors"]')).toBeNull();
    expect(container.querySelector('a[href^="/clients"]')).toBeNull();
  });

  it("renders My Bids history from the vendor-scoped RPC", async () => {
    const { container } = renderVendorWorkspace("/vendor-workspace/my-bids");

    expect(await screen.findByRole("heading", { name: "My Bids" })).toBeInTheDocument();
    expect(apiMock.fetchVendorWorkspaceMyBids).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText("Submitted Bids")).toHaveLength(2);
    expect(screen.getAllByText("Passed Opportunities")).toHaveLength(2);
    expect(screen.getAllByText("Selected").length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText("Not Selected / Expired")).toHaveLength(2);
    expect(screen.getByText("456 Vendor Lane")).toBeInTheDocument();
    expect(screen.getByText("AMC-DEMO-004")).toBeInTheDocument();
    expect(screen.getByText("$1,450.00")).toBeInTheDocument();
    expect(screen.getByText("Available next week.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View Work Detail" })).toHaveAttribute(
      "href",
      "/vendor-workspace/available-work/submitted-work-key",
    );

    fireEvent.click(screen.getByRole("tab", { name: "Passed Opportunities" }));
    expect(screen.getByText("789 Passed Road")).toBeInTheDocument();
    expect(screen.getByText("Too busy / capacity")).toBeInTheDocument();
    expect(screen.getByText("At capacity next week.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Selected" }));
    expect(screen.getByText("123 Selected Ave")).toBeInTheDocument();
    expect(screen.getByText("$1,800.00")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Not Selected / Expired" }));
    expect(screen.getByText("321 Expired Blvd")).toBeInTheDocument();
    expect(screen.getByText("Expired")).toBeInTheDocument();

    [
      "order-id-1",
      "relationship-id-1",
      "vendor-profile-id-1",
      "bid-request-id-1",
      "recipient-id-1",
      "response-id-1",
      "candidate_snapshot",
      "handoff_payload",
      "client_fee",
      "amc_margin",
      "submitted-work-key",
      "passed-work-key",
    ].forEach((hiddenText) => {
      expect(screen.queryByText(hiddenText)).toBeNull();
    });

    expect(container.querySelector('a[href^="/orders"]')).toBeNull();
    expect(container.querySelector('a[href^="/vendors"]')).toBeNull();
    expect(container.querySelector('a[href^="/clients"]')).toBeNull();
  });

  it("renders Vendor Workspace payments from vendor-safe payment rows", async () => {
    const { container } = renderVendorWorkspace("/vendor-workspace/payments");

    expect(await screen.findByRole("heading", { name: "Falcon AMC Payments" })).toBeInTheDocument();
    expect(screen.getByText("Vendor Invoices", { exact: false })).toBeInTheDocument();
    expect(apiMock.fetchVendorWorkspacePayments).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("article", { name: "Ready for Invoice payments" })).toHaveTextContent("1");
    expect(screen.getByRole("article", { name: "Invoice Received payments" })).toHaveTextContent("1");
    expect(screen.getByRole("article", { name: "Approved payments" })).toHaveTextContent("1");
    expect(screen.getByRole("article", { name: "Scheduled payments" })).toHaveTextContent("1");
    expect(screen.getByRole("article", { name: "Paid payments" })).toHaveTextContent("1");
    expect(screen.getByRole("article", { name: "On Hold payments" })).toHaveTextContent("1");
    expect(screen.getByRole("article", { name: "Rejected payments" })).toHaveTextContent("1");
    expect(screen.getByText("987 Assigned Way")).toBeInTheDocument();
    expect(screen.getByText("123 Paid Lane")).toBeInTheDocument();
    expect(screen.getByText("333 Scheduled Row")).toBeInTheDocument();
    expect(screen.getByText("$1,250.00")).toBeInTheDocument();
    expect(screen.getByText("$950.00")).toBeInTheDocument();
    expect(screen.getAllByText("Submit invoice").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "Submit Invoice" })).toBeInTheDocument();
    expect(screen.getByText("ACH")).toBeInTheDocument();
    expect(screen.getByText("ACH ending 1234")).toBeInTheDocument();
    expect(screen.getByText("Payment was sent by ACH.")).toBeInTheDocument();
    expect(screen.getByText("Check")).toBeInTheDocument();
    expect(screen.getByText("Check run 42")).toBeInTheDocument();
    expect(screen.getByText("Payment is scheduled for the next check run.")).toBeInTheDocument();
    expect(screen.getAllByText("Continental AMC").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "View Assigned Order" })[0]).toHaveAttribute(
      "href",
      "/vendor-workspace/assigned-orders/assigned-work-key-1",
    );

    [
      "assignment-id-1",
      "order-id-1",
      "relationship-id-1",
      "vendor-profile-id-1",
      "client_fee",
      "amc_margin",
      "internal_notes",
      "candidate_score",
      "storage_path",
    ].forEach((hiddenText) => {
      expect(screen.queryByText(hiddenText)).toBeNull();
    });

    expect(container.querySelector('a[href^="/orders"]')).toBeNull();
    expect(container.querySelector('a[href^="/vendors"]')).toBeNull();
    expect(container.querySelector('a[href^="/clients"]')).toBeNull();
  });

  it("uploads and submits an invoice from the Vendor Workspace payments page", async () => {
    apiMock.fetchVendorWorkspacePayments
      .mockResolvedValueOnce(payments)
      .mockResolvedValueOnce({
        ok: true,
        items: [
          {
            ...payments.items[0],
            invoice_status: "Invoice Received",
            payment_status: "Invoice Received",
            payment_status_key: "invoice_received",
            next_action_label: "Awaiting payment review",
          },
        ],
      });
    renderVendorWorkspace("/vendor-workspace/payments");

    expect(await screen.findByRole("heading", { name: "Falcon AMC Payments" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Invoice Number"), {
      target: { value: "INV-1001" },
    });
    fireEvent.change(screen.getByLabelText("Invoice Amount"), {
      target: { value: "1250" },
    });
    fireEvent.change(screen.getAllByLabelText("Vendor Note")[0], {
      target: { value: "Please process this invoice." },
    });

    const invoiceFile = new File(["invoice contents"], "invoice.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Invoice PDF"), {
      target: { files: [invoiceFile] },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Upload Invoice File" })[0]);

    await waitFor(() => {
      expect(apiMock.createVendorWorkspaceInvoiceUploadUrl).toHaveBeenCalledWith("assigned-work-key-1", {
        file_name: "invoice.pdf",
        mime_type: "application/pdf",
        file_size: invoiceFile.size,
        document_role: "vendor_invoice",
      });
    });
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("https://example.test/vendor-invoice-upload", expect.objectContaining({
        method: "PUT",
      }));
    });
    await waitFor(() => {
      expect(apiMock.registerVendorWorkspaceInvoiceDocument).toHaveBeenCalledWith("assigned-work-key-1", {
        document_key: "i".repeat(64),
        file_name: "invoice.pdf",
        mime_type: "application/pdf",
        file_size: invoiceFile.size,
        document_role: "vendor_invoice",
      });
    });

    expect(await screen.findByText(/uploaded and ready to submit/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Submit Invoice" }));

    await waitFor(() => {
      expect(apiMock.submitVendorWorkspaceInvoice).toHaveBeenCalledWith("assigned-work-key-1", {
        invoice_number: "INV-1001",
        invoice_amount: 1250,
        currency: "USD",
        invoice_date: null,
        vendor_note: "Please process this invoice.",
        document_keys: ["i".repeat(64)],
      });
    });
    expect(await screen.findByText("Invoice submitted.")).toBeInTheDocument();
  });

  it("resubmits a corrected invoice from a rejected Vendor Workspace payments row", async () => {
    apiMock.fetchVendorWorkspacePayments
      .mockResolvedValueOnce(payments)
      .mockResolvedValueOnce({
        ok: true,
        items: [
          {
            ...payments.items[2],
            invoice_status: "Invoice Received",
            payment_status: "Invoice Received",
            payment_status_key: "invoice_received",
            next_action_label: "Awaiting payment review",
          },
        ],
      });
    renderVendorWorkspace("/vendor-workspace/payments");

    expect(await screen.findByRole("heading", { name: "Falcon AMC Payments" })).toBeInTheDocument();
    expect(screen.getByText("Invoice rejected")).toBeInTheDocument();
    expect(screen.getByText("Please correct the invoice amount and upload a revised PDF.")).toBeInTheDocument();
    expect(screen.getByText("INV-0999")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Submit Corrected Invoice" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Corrected Invoice Number"), {
      target: { value: "INV-0999-R" },
    });
    fireEvent.change(screen.getByLabelText("Corrected Invoice Amount"), {
      target: { value: "1100" },
    });
    fireEvent.change(screen.getAllByLabelText("Vendor Note")[1], {
      target: { value: "Corrected invoice amount attached." },
    });

    const correctedInvoiceFile = new File(["corrected invoice"], "invoice-corrected.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(screen.getByLabelText("Corrected Invoice PDF"), {
      target: { files: [correctedInvoiceFile] },
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Upload Invoice File" })[1]);

    await waitFor(() => {
      expect(apiMock.createVendorWorkspaceInvoiceUploadUrl).toHaveBeenCalledWith("rejected-assigned-work-key", {
        file_name: "invoice-corrected.pdf",
        mime_type: "application/pdf",
        file_size: correctedInvoiceFile.size,
        document_role: "vendor_invoice",
      });
    });
    await waitFor(() => {
      expect(apiMock.registerVendorWorkspaceInvoiceDocument).toHaveBeenCalledWith("rejected-assigned-work-key", {
        document_key: "i".repeat(64),
        file_name: "invoice-corrected.pdf",
        mime_type: "application/pdf",
        file_size: correctedInvoiceFile.size,
        document_role: "vendor_invoice",
      });
    });

    expect(await screen.findByText(/uploaded and ready to submit/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Submit Corrected Invoice" }));

    await waitFor(() => {
      expect(apiMock.resubmitVendorWorkspaceInvoice).toHaveBeenCalledWith("rejected-assigned-work-key", {
        invoice_number: "INV-0999-R",
        invoice_amount: 1100,
        currency: "USD",
        invoice_date: null,
        vendor_note: "Corrected invoice amount attached.",
        document_keys: ["i".repeat(64)],
      });
    });
    expect(await screen.findByText("Corrected invoice submitted.")).toBeInTheDocument();
    expect(apiMock.submitVendorWorkspaceInvoice).not.toHaveBeenCalledWith(
      "rejected-assigned-work-key",
      expect.any(Object),
    );
  });

  it("validates invoice submission before calling the vendor invoice RPC", async () => {
    renderVendorWorkspace("/vendor-workspace/payments");

    expect(await screen.findByRole("heading", { name: "Falcon AMC Payments" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Submit Invoice" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Enter an invoice number.");
    expect(apiMock.submitVendorWorkspaceInvoice).not.toHaveBeenCalled();
  });

  it("renders the read-only Vendor Workspace profile page from vendor-safe profile data", async () => {
    const { container } = renderVendorWorkspace("/vendor-workspace/profile");

    expect(await screen.findByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(apiMock.fetchVendorWorkspaceProfile).toHaveBeenCalledTimes(1);
    expect(apiMock.fetchVendorWorkspaceProfileUpdateRequests).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Profile editing requires AMC review")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request Update" })).toBeInTheDocument();
    expect(screen.getByText("Field Partner Valuation")).toBeInTheDocument();
    expect(screen.getAllByText("Jordan Vendor").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/jordan@example\.com/).length).toBeGreaterThan(0);
    expect(screen.getByText("OH, MI")).toBeInTheDocument();
    expect(screen.getAllByText("Franklin, OH").length).toBeGreaterThan(0);
    expect(screen.getByText("Office, Retail")).toBeInTheDocument();
    expect(screen.getByText("Commercial Appraisal")).toBeInTheDocument();
    expect(screen.getByText("7 days")).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.getByText("1 profile update request is waiting for AMC review.")).toBeInTheDocument();
    expect(screen.getByText("Please add Delaware County coverage.")).toBeInTheDocument();

    [
      "relationship-id-1",
      "vendor-profile-id-1",
      "internal coordinator notes",
      "client_fee",
      "amc_margin",
    ].forEach((hiddenText) => {
      expect(screen.queryByText(hiddenText)).toBeNull();
    });

    expect(container.querySelector('a[href^="/orders"]')).toBeNull();
    expect(container.querySelector('a[href^="/vendors"]')).toBeNull();
    expect(container.querySelector('a[href^="/clients"]')).toBeNull();
  });

  it("shows safe Vendor Profile update request decision status from AMC review", async () => {
    apiMock.fetchVendorWorkspaceProfileUpdateRequests.mockResolvedValue({
      ok: true,
      requests: [
        {
          request_key: "opaque-profile-request-key",
          status: "approved",
          submitted_at: "2026-06-05T14:00:00.000Z",
          updated_at: "2026-06-05T15:00:00.000Z",
          reviewed_at: "2026-06-05T15:00:00.000Z",
          reviewer_message: "Approved. Delaware County is now active.",
          proposed_changes: {
            comments: "Please add Delaware County coverage.",
          },
        },
      ],
    });

    renderVendorWorkspace("/vendor-workspace/profile");

    expect(await screen.findByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getAllByText("Approved").length).toBeGreaterThan(0);
    expect(screen.getByText("Approved. Delaware County is now active.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /approve/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /reject/i })).toBeNull();
  });

  it("submits a Vendor Workspace profile update request without mutating owner-side profile APIs", async () => {
    renderVendorWorkspace("/vendor-workspace/profile");

    expect(await screen.findByRole("heading", { name: "Profile" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Request Update" }));

    expect(screen.getByRole("heading", { name: "Request Profile Update" })).toBeInTheDocument();
    expect(screen.getByText(/Proposed changes are reviewed before they affect operational coverage/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Vendor manager email"), {
      target: { value: "updated@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Coverage counties"), {
      target: { value: "Franklin, OH\nDelaware, OH" },
    });
    fireEvent.change(screen.getByLabelText("Comments / explanation"), {
      target: { value: "Please update contact email and coverage." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));

    await waitFor(() => {
      expect(apiMock.submitVendorWorkspaceProfileUpdateRequest).toHaveBeenCalledTimes(1);
    });
    expect(apiMock.submitVendorWorkspaceProfileUpdateRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        contact_changes: expect.objectContaining({ email: "updated@example.com" }),
        coverage_changes: expect.objectContaining({
          counties: ["Franklin, OH", "Delaware, OH"],
        }),
        comments: "Please update contact email and coverage.",
      }),
    );
    expect(await screen.findByText("Profile update request submitted for AMC review.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Request Profile Update" })).toBeNull();
  });

  it("shows vendor profile update request validation errors safely", async () => {
    apiMock.submitVendorWorkspaceProfileUpdateRequest.mockResolvedValueOnce({
      ok: false,
      error: "profile_update_request_invalid",
      request: null,
      field_errors: {
        request: "Add at least one proposed change or explanation.",
      },
    });
    renderVendorWorkspace("/vendor-workspace/profile");

    expect(await screen.findByRole("heading", { name: "Profile" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Request Update" }));
    fireEvent.change(screen.getByLabelText("Vendor manager name"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Vendor manager email"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Vendor manager phone"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Company phone"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Website"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Coverage states"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Coverage counties"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Coverage markets"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Accepted property types"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Accepted report types"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit Request" }));

    expect(await screen.findByText("Review the request details and try again.")).toBeInTheDocument();
    expect(screen.getByText("Add at least one proposed change or explanation.")).toBeInTheDocument();
  });

  it("renders useful vendor profile empty states for missing coverage and compliance", async () => {
    apiMock.fetchVendorWorkspaceProfile.mockResolvedValueOnce({
      ok: true,
      profile: {
        ...vendorProfile.profile,
        primary_contact: null,
        contacts: [],
        coverage: {
          row_count: 0,
          states: [],
          counties: [],
          markets: [],
          service_areas: [],
        },
        accepted_work_types: {
          product_types: [],
          property_types: [],
          report_types: [],
        },
        compliance: {
          status: null,
          document_count: 0,
        },
      },
    });

    renderVendorWorkspace("/vendor-workspace/profile");

    expect(await screen.findByText("No vendor manager is currently listed.")).toBeInTheDocument();
    expect(screen.getByText("No coverage areas are currently listed for your profile.")).toBeInTheDocument();
    expect(screen.getByText("No accepted work types are currently listed.")).toBeInTheDocument();
    expect(screen.getByText("No compliance summary is currently listed.")).toBeInTheDocument();
  });

  it("renders Assigned Orders from the vendor-scoped assignment lifecycle RPC", async () => {
    const { container } = renderVendorWorkspace("/vendor-workspace/assigned-orders");

    expect(await screen.findByRole("heading", { name: "Assignments" })).toBeInTheDocument();
    expect(apiMock.fetchVendorWorkspaceAssignedOrders).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Track active assignments, due dates, revision requests, submitted reports, and the next step for your company.")).toBeInTheDocument();
    expect(screen.getByText("987 Assigned Way")).toBeInTheDocument();
    expect(screen.getByText("Cleveland, OH, 44114")).toBeInTheDocument();
    expect(screen.getByText("AMC-DEMO-009")).toBeInTheDocument();
    expect(screen.getByText("Multifamily")).toBeInTheDocument();
    expect(screen.getByText("Commercial Appraisal")).toBeInTheDocument();
    expect(screen.getAllByText("Accepted").length).toBeGreaterThan(0);
    expect(screen.getByText("Start Work")).toBeInTheDocument();
    expect(screen.getByText("Needs attention")).toBeInTheDocument();
    expect(screen.getByText("246 Submitted Street")).toBeInTheDocument();
    expect(screen.getAllByText("Submitted / Awaiting Review").length).toBeGreaterThan(0);
    expect(screen.getByText("Inspection Scheduled")).toBeInTheDocument();
    expect(screen.getByText("Awaiting Review")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "View Assignment" })).toHaveLength(2);
    expect(screen.getAllByRole("link", { name: "View Assignment" })[0]).toHaveAttribute(
      "href",
      "/vendor-workspace/assigned-orders/assigned-work-key-1",
    );

    [
      "assignment-id-1",
      "order-id-1",
      "relationship-id-1",
      "vendor-profile-id-1",
      "assigned-work-key-1",
      "storage_path",
      "client_fee",
      "amc_margin",
      "candidate_score",
      "internal_notes",
    ].forEach((hiddenText) => {
      expect(screen.queryByText(hiddenText)).toBeNull();
    });

    expect(container.querySelector('a[href^="/orders"]')).toBeNull();
    expect(container.querySelector('a[href^="/vendors"]')).toBeNull();
    expect(container.querySelector('a[href^="/clients"]')).toBeNull();
  });

  it("renders resubmitted assigned orders as resubmitted awaiting review", async () => {
    apiMock.fetchVendorWorkspaceAssignedOrders.mockResolvedValueOnce({
      ok: true,
      items: [
        {
          ...assignedOrders.items[1],
          assignment_status: "resubmitted_awaiting_review",
          status_label: "Resubmitted / Awaiting Review",
          next_action_label: "Awaiting Review",
          report_submitted: true,
        },
      ],
    });
    renderVendorWorkspace("/vendor-workspace/assigned-orders");

    expect(await screen.findByRole("heading", { name: "Assignments" })).toBeInTheDocument();
    expect(screen.getAllByText("Resubmitted / Awaiting Review").length).toBeGreaterThan(0);
    expect(screen.getByText("246 Submitted Street")).toBeInTheDocument();
  });

  it("opens an Assigned Orders row on the authenticated assigned order detail route", async () => {
    renderVendorWorkspace("/vendor-workspace/assigned-orders");

    expect(await screen.findByRole("heading", { name: "Assignments" })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("link", { name: "View Assignment" })[0]);

    expect(await screen.findByRole("heading", { name: "987 Assigned Way" })).toBeInTheDocument();
    expect(apiMock.fetchVendorWorkspaceAssignedOrderDetail).toHaveBeenCalledWith("assigned-work-key-1");
    expect(screen.getByText("Assignment Oversight")).toBeInTheDocument();
    expect(screen.getByText("Falcon AMC Assigned Order", { exact: false })).toBeInTheDocument();
  });

  it("renders assigned order detail from the vendor-scoped assignment detail RPC", async () => {
    const { container } = renderVendorWorkspace("/vendor-workspace/assigned-orders/assigned-work-key-1");

    expect(await screen.findByRole("heading", { name: "987 Assigned Way" })).toBeInTheDocument();
    expect(apiMock.fetchVendorWorkspaceAssignedOrderDetail).toHaveBeenCalledWith("assigned-work-key-1");
    expect(screen.getByText("Assignment Oversight")).toBeInTheDocument();
    expect(screen.getByText("Falcon AMC Assigned Order", { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText("Accepted").length).toBeGreaterThan(0);
    expect(screen.getByText("Next Step")).toBeInTheDocument();
    expect(screen.getByText("Property")).toBeInTheDocument();
    expect(screen.getByText("Assignment Timeline")).toBeInTheDocument();
    expect(screen.getByText("Scope & Instructions")).toBeInTheDocument();
    expect(screen.getAllByText("Documents").length).toBeGreaterThan(0);
    expect(screen.getByText("Report Upload / Submission")).toBeInTheDocument();
    expect(screen.getByText("Complete the commercial appraisal according to the engagement scope.")).toBeInTheDocument();
    expect(screen.getByText("Confirm inspection timing with property contact before starting work.")).toBeInTheDocument();
    expect(screen.getByText("Assignment Engagement")).toBeInTheDocument();
    expect(screen.getByText("source_documents")).toBeInTheDocument();
    expect(screen.getByText("application/pdf")).toBeInTheDocument();
    expect(screen.getByText("4 KB")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Start Work" })).toBeEnabled();
    expect(
      screen.getByText("Upload a report from Next Step when this assignment is in progress."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Assignments" })).toHaveAttribute(
      "href",
      "/vendor-workspace/assigned-orders",
    );

    [
      "assignment-id-1",
      "order-id-1",
      "relationship-id-1",
      "vendor-profile-id-1",
      "assigned-work-key-1",
      "storage_bucket",
      "storage_path",
      "client_fee",
      "amc_margin",
      "candidate_score",
      "internal_notes",
      "b".repeat(64),
    ].forEach((hiddenText) => {
      expect(screen.queryByText(hiddenText)).toBeNull();
    });

    expect(container.querySelector('a[href^="/orders"]')).toBeNull();
    expect(container.querySelector('a[href^="/vendors"]')).toBeNull();
    expect(container.querySelector('a[href^="/clients"]')).toBeNull();
  });

  it("opens assigned order documents through the assignment-scoped signed URL helper", async () => {
    const { container } = renderVendorWorkspace("/vendor-workspace/assigned-orders/assigned-work-key-1");

    expect(await screen.findByRole("heading", { name: "987 Assigned Way" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    await waitFor(() => {
      expect(apiMock.createVendorWorkspaceAssignmentDocumentDownloadUrl).toHaveBeenCalledWith(
        "assigned-work-key-1",
        "b".repeat(64),
      );
    });
    expect(window.open).toHaveBeenCalledWith(
      "https://example.test/vendor-assignment-signed-download",
      "_blank",
      "noopener,noreferrer",
    );

    [
      "storage_bucket",
      "storage_path",
      "private/order",
      "order-documents",
      "b".repeat(64),
    ].forEach((hiddenText) => {
      expect(screen.queryByText(hiddenText)).toBeNull();
    });
    expect(container.querySelector('a[href^="/orders"]')).toBeNull();
  });

  it("renders read-only placeholder sections for future vendor workspace areas", async () => {
    renderVendorWorkspace("/vendor-workspace/documents");

    expect(await screen.findByRole("heading", { name: "Documents" })).toBeInTheDocument();
    expect(screen.getByText("Vendor-safe assignment documents, report packages, and shared files will be organized here in a future workspace slice.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Dashboard" })).toHaveAttribute(
      "href",
      "/vendor-workspace/dashboard",
    );
    expect(screen.queryByRole("link", { name: "Client Portal" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Internal Operations" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Falcon AMC" })).toBeNull();
  });

  it("keeps inaccessible assigned order documents as metadata with a local unavailable state", async () => {
    apiMock.createVendorWorkspaceAssignmentDocumentDownloadUrl.mockRejectedValueOnce(
      new Error("You cannot download this document."),
    );
    renderVendorWorkspace("/vendor-workspace/assigned-orders/assigned-work-key-1");

    expect(await screen.findByRole("heading", { name: "987 Assigned Way" })).toBeInTheDocument();
    expect(screen.getByText("Assignment Engagement")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    expect(
      await screen.findByText("This document cannot be opened right now. Please try again later."),
    ).toBeInTheDocument();
    expect(screen.queryByText("You cannot download this document.")).toBeNull();
    expect(window.open).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Open" })).toBeEnabled();
  });

  it("renders submitted assigned order detail as read-only submission history", async () => {
    apiMock.fetchVendorWorkspaceAssignedOrderDetail.mockResolvedValueOnce(submittedAssignedOrderDetail);
    renderVendorWorkspace("/vendor-workspace/assigned-orders/submitted-assigned-work-key");

    expect(await screen.findByRole("heading", { name: "246 Submitted Street" })).toBeInTheDocument();
    expect(screen.getAllByText("Submitted / Awaiting Review").length).toBeGreaterThan(0);
    expect(screen.getByText("Report package submitted for AMC review.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Start Work" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Submit Report" })).toBeNull();
  });

  it("starts assigned work from assigned order detail and refreshes server state", async () => {
    apiMock.fetchVendorWorkspaceAssignedOrderDetail
      .mockResolvedValueOnce(assignedOrderDetail)
      .mockResolvedValueOnce({
        ok: true,
        item: {
          ...assignedOrderDetail.item,
          assignment_status: "in_progress",
          status_label: "In Progress",
          next_action_label: "Submit Report",
          started_at: "2026-06-04T22:30:00.000Z",
          timeline: {
            ...assignedOrderDetail.item.timeline,
            started_at: "2026-06-04T22:30:00.000Z",
          },
          needs_attention: false,
        },
      });
    renderVendorWorkspace("/vendor-workspace/assigned-orders/assigned-work-key-1");

    expect(await screen.findByRole("heading", { name: "987 Assigned Way" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start Work" }));

    await waitFor(() => {
      expect(apiMock.startVendorWorkspaceAssignedOrder).toHaveBeenCalledWith("assigned-work-key-1");
    });
    expect(await screen.findByText("Work started.")).toBeInTheDocument();
    expect(screen.getAllByText("In Progress").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Submit Report" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "Start Work" })).toBeNull();
  });

  it("submits a report from assigned order detail and refreshes to awaiting review", async () => {
    apiMock.fetchVendorWorkspaceAssignedOrderDetail
      .mockResolvedValueOnce(inProgressAssignedOrderDetail)
      .mockResolvedValueOnce(submittedAssignedOrderDetail);
    renderVendorWorkspace("/vendor-workspace/assigned-orders/assigned-work-key-1");

    expect(await screen.findByRole("heading", { name: "987 Assigned Way" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Submit Report" })).toBeEnabled();
    const reportFile = new File(["report contents"], "report.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Report PDF"), {
      target: { files: [reportFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload Report File" }));

    await waitFor(() => {
      expect(apiMock.createVendorWorkspaceReportUploadUrl).toHaveBeenCalledWith("assigned-work-key-1", {
        file_name: "report.pdf",
        mime_type: "application/pdf",
        file_size: reportFile.size,
        document_role: "submitted_report",
    });
  });

    await waitFor(() => {
      expect(apiMock.registerVendorWorkspaceReportDocument).toHaveBeenCalledWith("assigned-work-key-1", {
        document_key: "d".repeat(64),
        file_name: "report.pdf",
        mime_type: "application/pdf",
        file_size: reportFile.size,
        document_role: "submitted_report",
      });
    });
    expect(await screen.findByText("report.pdf")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Delivery Note"), {
      target: { value: "Report is ready for review." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit Report" }));

    await waitFor(() => {
      expect(apiMock.submitVendorWorkspaceReport).toHaveBeenCalledWith("assigned-work-key-1", {
        comments: "Report is ready for review.",
        document_keys: ["d".repeat(64)],
      });
    });
    expect(await screen.findByText("Report submitted.")).toBeInTheDocument();
    expect(screen.getAllByText("Submitted / Awaiting Review").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Submit Report" })).toBeNull();
  });

  it("shows the structured report upload URL failure reason from the Edge helper", async () => {
    const uploadError = new Error("You cannot upload reports for this assignment.");
    uploadError.code = "upload_not_authorized";
    uploadError.details = {
      rpc_code: "42501",
      rpc_message: "vendor_documents_upload_permission_required",
    };
    apiMock.createVendorWorkspaceReportUploadUrl.mockRejectedValueOnce(uploadError);
    apiMock.fetchVendorWorkspaceAssignedOrderDetail.mockResolvedValue(inProgressAssignedOrderDetail);

    renderVendorWorkspace("/vendor-workspace/assigned-orders/assigned-work-key-1");

    expect(await screen.findByRole("heading", { name: "987 Assigned Way" })).toBeInTheDocument();
    const reportFile = new File(["report contents"], "report.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Report PDF"), {
      target: { files: [reportFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload Report File" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You cannot upload reports for this assignment.",
    );
    expect(apiMock.registerVendorWorkspaceReportDocument).not.toHaveBeenCalled();
    expect(apiMock.submitVendorWorkspaceReport).not.toHaveBeenCalled();
  });

  it("resubmits a revision from assigned order detail and refreshes to awaiting review", async () => {
    apiMock.fetchVendorWorkspaceAssignedOrderDetail
      .mockResolvedValueOnce(revisionRequestedAssignedOrderDetail)
      .mockResolvedValueOnce(resubmittedAssignedOrderDetail);
    renderVendorWorkspace("/vendor-workspace/assigned-orders/assigned-work-key-1");

    expect(await screen.findByRole("heading", { name: "987 Assigned Way" })).toBeInTheDocument();
    expect(screen.getAllByText("Revision Requested").length).toBeGreaterThan(0);
    expect(screen.getByText("Update the rent comparable discussion and resubmit the corrected report.")).toBeInTheDocument();
    expect(screen.getAllByText("Continental AMC").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Submit Report" })).toBeNull();
    apiMock.registerVendorWorkspaceReportDocument.mockResolvedValueOnce({
      ok: true,
      document: {
        document_key: "d".repeat(64),
        file_name: "revised-report.pdf",
        mime_type: "application/pdf",
        file_size: 1024,
      },
      field_errors: {},
    });

    const reportFile = new File(["revised report contents"], "revised-report.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Revised Report PDF"), {
      target: { files: [reportFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload Revision File" }));

    await waitFor(() => {
      expect(apiMock.registerVendorWorkspaceReportDocument).toHaveBeenCalledWith("assigned-work-key-1", {
        document_key: "d".repeat(64),
        file_name: "revised-report.pdf",
        mime_type: "application/pdf",
        file_size: reportFile.size,
        document_role: "submitted_report",
      });
    });
    expect(await screen.findByText("revised-report.pdf")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Revision Response Note"), {
      target: { value: "Revision complete." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Resubmit Report" }));

    await waitFor(() => {
      expect(apiMock.resubmitVendorWorkspaceReport).toHaveBeenCalledWith("assigned-work-key-1", {
        comments: "Revision complete.",
        document_keys: ["d".repeat(64)],
      });
    });
    expect(await screen.findByText("Report resubmitted.")).toBeInTheDocument();
    expect(screen.getAllByText("Resubmitted / Awaiting Review").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Resubmit Report" })).toBeNull();
  });

  it("shows friendly assigned report submit validation and unavailable states", async () => {
    apiMock.fetchVendorWorkspaceAssignedOrderDetail.mockResolvedValueOnce(inProgressAssignedOrderDetail);
    apiMock.submitVendorWorkspaceReport.mockResolvedValueOnce({
      ok: false,
      error: "report_submission_invalid",
      field_errors: {
        action: "Only in-progress assignments can be submitted.",
      },
    });
    renderVendorWorkspace("/vendor-workspace/assigned-orders/assigned-work-key-1");

    expect(await screen.findByRole("heading", { name: "987 Assigned Way" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Submit Report" }));
    expect(await screen.findByText("Upload at least one report PDF before submitting.")).toBeInTheDocument();
    const reportFile = new File(["report contents"], "report.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Report PDF"), {
      target: { files: [reportFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload Report File" }));
    await screen.findByText("report.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Submit Report" }));
    expect(await screen.findByText("Only in-progress assignments can be submitted.")).toBeInTheDocument();

    cleanup();
    apiMock.fetchVendorWorkspaceAssignedOrderDetail.mockResolvedValue(inProgressAssignedOrderDetail);
    apiMock.submitVendorWorkspaceReport.mockResolvedValueOnce({
      ok: false,
      error: "assigned_order_unavailable",
      field_errors: {},
    });
    renderVendorWorkspace("/vendor-workspace/assigned-orders/assigned-work-key-1");

    expect(await screen.findByRole("heading", { name: "987 Assigned Way" })).toBeInTheDocument();
    const unavailableReportFile = new File(["report contents"], "report.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Report PDF"), {
      target: { files: [unavailableReportFile] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload Report File" }));
    await screen.findByText("report.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Submit Report" }));
    expect(await screen.findByText("Assigned order detail unavailable")).toBeInTheDocument();
  });

  it("shows friendly assigned work start validation and unavailable states", async () => {
    apiMock.startVendorWorkspaceAssignedOrder.mockResolvedValueOnce({
      ok: false,
      error: "assignment_start_invalid",
      field_errors: {
        action: "Only accepted assignments that have not started can be started.",
      },
    });
    renderVendorWorkspace("/vendor-workspace/assigned-orders/assigned-work-key-1");

    expect(await screen.findByRole("heading", { name: "987 Assigned Way" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start Work" }));
    expect(
      await screen.findByText("Only accepted assignments that have not started can be started."),
    ).toBeInTheDocument();

    cleanup();
    apiMock.fetchVendorWorkspaceAssignedOrderDetail.mockResolvedValue(assignedOrderDetail);
    apiMock.startVendorWorkspaceAssignedOrder.mockResolvedValueOnce({
      ok: false,
      error: "assigned_order_unavailable",
      field_errors: {},
    });
    renderVendorWorkspace("/vendor-workspace/assigned-orders/assigned-work-key-1");

    expect(await screen.findByRole("heading", { name: "987 Assigned Way" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start Work" }));
    expect(await screen.findByText("Assigned order detail unavailable")).toBeInTheDocument();
  });

  it("opens a My Bids row on the existing vendor work detail route", async () => {
    apiMock.fetchVendorWorkspaceAvailableWorkDetail.mockResolvedValueOnce(submittedWorkDetail);
    renderVendorWorkspace("/vendor-workspace/my-bids");

    expect(await screen.findByRole("heading", { name: "My Bids" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("link", { name: "View Work Detail" }));

    expect(await screen.findByRole("heading", { name: "456 Vendor Lane" })).toBeInTheDocument();
    expect(apiMock.fetchVendorWorkspaceAvailableWorkDetail).toHaveBeenCalledWith("submitted-work-key");
    expect(screen.getByRole("heading", { name: "Bid Submitted" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit Bid" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Pass Opportunity" })).toBeNull();
  });

  it("renders read-only available work detail from the vendor-scoped detail RPC", async () => {
    const { container } = renderVendorWorkspace("/vendor-workspace/available-work/opaque-work-key-1");

    expect(await screen.findByRole("heading", { name: "456 Vendor Lane" })).toBeInTheDocument();
    expect(apiMock.fetchVendorWorkspaceAvailableWorkDetail).toHaveBeenCalledWith("opaque-work-key-1");
    expect(screen.getByText("Procurement Opportunity")).toBeInTheDocument();
    expect(screen.getByText("Falcon AMC Work Detail", { exact: false })).toBeInTheDocument();
    expect(screen.getByText((_, node) => node?.textContent === "Falcon AMC Work Detail · Detroit, MI, 48226")).toBeInTheDocument();
    expect(screen.getByText("Continental AMC")).toBeInTheDocument();
    expect(screen.getByText("AMC-DEMO-004")).toBeInTheDocument();
    expect(screen.getByText("Retail")).toBeInTheDocument();
    expect(screen.getByText("Commercial Appraisal")).toBeInTheDocument();
    expect(screen.getByText("Wayne")).toBeInTheDocument();
    expect(screen.getByText("Exterior review requested.")).toBeInTheDocument();
    expect(screen.getByText("Confirm availability before bidding.")).toBeInTheDocument();
    expect(screen.getByText("Engagement Letter")).toBeInTheDocument();
    expect(screen.getByText("source_documents")).toBeInTheDocument();
    expect(screen.getByText("application/pdf")).toBeInTheDocument();
    expect(screen.getByText("2 KB")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Submit Bid" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Pass Opportunity" })).toBeEnabled();

    [
      "order-id-1",
      "relationship-id-1",
      "vendor-profile-id-1",
      "bid-request-id-1",
      "recipient-id-1",
      "response-id-1",
      "document-id-1",
      "storage_bucket",
      "storage_path",
      "candidate_snapshot",
      "handoff_payload",
      "client_fee",
      "amc_margin",
      "opaque-work-key-1",
    ].forEach((hiddenText) => {
      expect(screen.queryByText(hiddenText)).toBeNull();
    });

    expect(container.querySelector('a[href^="/orders"]')).toBeNull();
    expect(container.querySelector('a[href^="/vendors"]')).toBeNull();
    expect(container.querySelector('a[href^="/clients"]')).toBeNull();
  });

  it("opens vendor-visible documents through the vendor-scoped signed URL helper", async () => {
    const { container } = renderVendorWorkspace("/vendor-workspace/available-work/opaque-work-key-1");

    expect(await screen.findByRole("heading", { name: "456 Vendor Lane" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    await waitFor(() => {
      expect(apiMock.createVendorWorkspaceDocumentDownloadUrl).toHaveBeenCalledWith(
        "opaque-work-key-1",
        "a".repeat(64),
      );
    });
    expect(window.open).toHaveBeenCalledWith(
      "https://example.test/vendor-signed-download",
      "_blank",
      "noopener,noreferrer",
    );

    [
      "storage_bucket",
      "storage_path",
      "private/order",
      "order-documents",
      "a".repeat(64),
    ].forEach((hiddenText) => {
      expect(screen.queryByText(hiddenText)).toBeNull();
    });
    expect(container.querySelector('a[href^="/orders"]')).toBeNull();
  });

  it("keeps inaccessible vendor documents as metadata with a local unavailable state", async () => {
    apiMock.createVendorWorkspaceDocumentDownloadUrl.mockRejectedValueOnce(
      new Error("You cannot download this document."),
    );
    renderVendorWorkspace("/vendor-workspace/available-work/opaque-work-key-1");

    expect(await screen.findByRole("heading", { name: "456 Vendor Lane" })).toBeInTheDocument();
    expect(screen.getByText("Engagement Letter")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open" }));

    expect(
      await screen.findByText("This document cannot be opened right now. Please try again later."),
    ).toBeInTheDocument();
    expect(screen.queryByText("You cannot download this document.")).toBeNull();
    expect(window.open).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Open" })).toBeEnabled();
  });

  it("renders submitted bid detail as read-only history", async () => {
    apiMock.fetchVendorWorkspaceAvailableWorkDetail.mockResolvedValueOnce(submittedWorkDetail);
    renderVendorWorkspace("/vendor-workspace/available-work/submitted-work-key");

    expect(await screen.findByRole("heading", { name: "456 Vendor Lane" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bid Submitted" })).toBeInTheDocument();
    expect(screen.getByText("$1,450.00")).toBeInTheDocument();
    expect(screen.getAllByText("8 days").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Available next week.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit Bid" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Pass Opportunity" })).toBeNull();
  });

  it("renders declined bid detail as read-only passed history", async () => {
    apiMock.fetchVendorWorkspaceAvailableWorkDetail.mockResolvedValueOnce(declinedWorkDetail);
    renderVendorWorkspace("/vendor-workspace/available-work/passed-work-key");

    expect(await screen.findByRole("heading", { name: "789 Passed Road" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Opportunity Passed" })).toBeInTheDocument();
    expect(screen.getByText("Too busy / capacity")).toBeInTheDocument();
    expect(screen.getByText("At capacity next week.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit Bid" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Pass Opportunity" })).toBeNull();
  });

  it("renders expired bid detail without bid actions", async () => {
    apiMock.fetchVendorWorkspaceAvailableWorkDetail.mockResolvedValueOnce(expiredWorkDetail);
    renderVendorWorkspace("/vendor-workspace/available-work/expired-work-key");

    expect(await screen.findByRole("heading", { name: "321 Expired Blvd" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Opportunity Expired" })).toBeInTheDocument();
    expect(screen.getByText("The bid deadline has passed. Bid submission and pass actions are no longer available.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit Bid" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Pass Opportunity" })).toBeNull();
  });

  it("renders selected and not-selected bid detail outcome summaries", async () => {
    apiMock.fetchVendorWorkspaceAvailableWorkDetail.mockResolvedValueOnce(selectedWorkDetail);
    renderVendorWorkspace("/vendor-workspace/available-work/selected-work-key");

    expect(await screen.findByRole("heading", { name: "123 Selected Ave" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bid Selected" })).toBeInTheDocument();
    expect(screen.getByText("Your submitted bid was selected for this opportunity.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bid Submitted" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit Bid" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Pass Opportunity" })).toBeNull();

    cleanup();
    apiMock.fetchVendorWorkspaceAvailableWorkDetail.mockResolvedValueOnce(notSelectedWorkDetail);
    renderVendorWorkspace("/vendor-workspace/available-work/not-selected-work-key");

    expect(await screen.findByRole("heading", { name: "654 Not Selected Drive" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Bid Not Selected" })).toBeInTheDocument();
    expect(screen.getByText("This opportunity has closed and your submitted bid was not selected.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Submit Bid" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Pass Opportunity" })).toBeNull();
  });

  it("submits a vendor workspace bid response and renders a read-only submitted summary", async () => {
    renderVendorWorkspace("/vendor-workspace/available-work/opaque-work-key-1");

    expect(await screen.findByRole("heading", { name: "456 Vendor Lane" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Fee"), { target: { value: "1450" } });
    fireEvent.change(screen.getByLabelText("Turn Time Days"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("Comments"), { target: { value: "Available next week." } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Bid" }));

    await waitFor(() => {
      expect(apiMock.submitVendorWorkspaceBidResponse).toHaveBeenCalledWith("opaque-work-key-1", {
        fee_amount: "1450",
        currency: "USD",
        turn_time_days: "8",
        proposed_due_at: "",
        comments: "Available next week.",
      });
    });

    expect(await screen.findByRole("heading", { name: "Bid Submitted" })).toBeInTheDocument();
    expect(screen.getByText("$1,450.00")).toBeInTheDocument();
    expect(screen.getAllByText("8 days").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Available next week.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Fee")).toBeNull();
    expect(screen.queryByRole("button", { name: "Submit Bid" })).toBeNull();
  });

  it("declines a vendor workspace bid opportunity and prevents bid submission", async () => {
    renderVendorWorkspace("/vendor-workspace/available-work/opaque-work-key-1");

    expect(await screen.findByRole("heading", { name: "456 Vendor Lane" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pass Opportunity" }));
    expect(screen.getByRole("heading", { name: "Pass Opportunity" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Too busy / capacity" } });
    fireEvent.change(screen.getByLabelText("Pass Comments"), { target: { value: "At capacity next week." } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Pass" }));

    await waitFor(() => {
      expect(apiMock.declineVendorWorkspaceBidOpportunity).toHaveBeenCalledWith("opaque-work-key-1", {
        reason: "Too busy / capacity",
        comments: "At capacity next week.",
      });
    });

    expect(await screen.findByRole("heading", { name: "Opportunity Passed" })).toBeInTheDocument();
    expect(screen.getByText("Too busy / capacity")).toBeInTheDocument();
    expect(screen.getByText("At capacity next week.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Fee")).toBeNull();
    expect(screen.queryByRole("button", { name: "Submit Bid" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Pass Opportunity" })).toBeNull();
  });

  it("renders vendor submit validation and lifecycle states safely", async () => {
    apiMock.submitVendorWorkspaceBidResponse.mockResolvedValueOnce({
      ok: false,
      error: "bid_submission_invalid",
      field_errors: {
        fee_amount: "Fee amount is required.",
        timing: "Provide either turn time days or a proposed due date.",
      },
      bid: null,
    });
    renderVendorWorkspace("/vendor-workspace/available-work/opaque-work-key-1");

    expect(await screen.findByRole("heading", { name: "456 Vendor Lane" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Submit Bid" }));

    expect(await screen.findByText("Check the highlighted fields and try again.")).toBeInTheDocument();
    expect(screen.getByText("Fee amount is required.")).toBeInTheDocument();
    expect(screen.getByText("Provide either turn time days or a proposed due date.")).toBeInTheDocument();

    cleanup();
    apiMock.submitVendorWorkspaceBidResponse.mockResolvedValueOnce({
      ok: false,
      error: "bid_already_submitted",
      bid: {
        fee_amount: 900,
        currency: "USD",
        proposed_due_at: "2026-06-12T20:00:00.000Z",
        submitted_at: "2026-06-04T18:00:00.000Z",
      },
      field_errors: {},
    });
    renderVendorWorkspace("/vendor-workspace/available-work/opaque-work-key-1");

    expect(await screen.findByRole("heading", { name: "456 Vendor Lane" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Fee"), { target: { value: "900" } });
    fireEvent.change(screen.getByLabelText("Turn Time Days"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Bid" }));
    expect(await screen.findByRole("heading", { name: "Bid Submitted" })).toBeInTheDocument();
    expect(screen.getByText("$900.00")).toBeInTheDocument();

    cleanup();
    apiMock.submitVendorWorkspaceBidResponse.mockResolvedValueOnce({
      ok: false,
      error: "bid_opportunity_expired",
      bid: null,
      field_errors: {},
    });
    renderVendorWorkspace("/vendor-workspace/available-work/opaque-work-key-1");

    expect(await screen.findByRole("heading", { name: "456 Vendor Lane" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Fee"), { target: { value: "900" } });
    fireEvent.change(screen.getByLabelText("Turn Time Days"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit Bid" }));
    expect(await screen.findByText("The bid deadline has passed.")).toBeInTheDocument();
  });

  it("renders vendor decline validation and lifecycle states safely", async () => {
    apiMock.declineVendorWorkspaceBidOpportunity.mockResolvedValueOnce({
      ok: false,
      error: "bid_decline_invalid",
      field_errors: {
        reason: "Choose a valid decline reason.",
      },
      decline: null,
      bid: null,
    });
    renderVendorWorkspace("/vendor-workspace/available-work/opaque-work-key-1");

    expect(await screen.findByRole("heading", { name: "456 Vendor Lane" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pass Opportunity" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Pass" }));

    expect(await screen.findByText("Check the decline details and try again.")).toBeInTheDocument();
    expect(screen.getByText("Choose a valid decline reason.")).toBeInTheDocument();

    cleanup();
    apiMock.declineVendorWorkspaceBidOpportunity.mockResolvedValueOnce({
      ok: false,
      error: "bid_already_declined",
      decline: {
        status: "declined",
        reason: "Other",
        comments: "Previously declined.",
        declined_at: "2026-06-04T18:30:00.000Z",
      },
      field_errors: {},
      bid: null,
    });
    renderVendorWorkspace("/vendor-workspace/available-work/opaque-work-key-1");

    expect(await screen.findByRole("heading", { name: "456 Vendor Lane" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pass Opportunity" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Pass" }));
    expect(await screen.findByRole("heading", { name: "Opportunity Passed" })).toBeInTheDocument();
    expect(screen.getByText("Previously declined.")).toBeInTheDocument();

    cleanup();
    apiMock.declineVendorWorkspaceBidOpportunity.mockResolvedValueOnce({
      ok: false,
      error: "bid_already_submitted",
      bid: {
        fee_amount: 900,
        currency: "USD",
        submitted_at: "2026-06-04T18:00:00.000Z",
      },
      decline: null,
      field_errors: {},
    });
    renderVendorWorkspace("/vendor-workspace/available-work/opaque-work-key-1");

    expect(await screen.findByRole("heading", { name: "456 Vendor Lane" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pass Opportunity" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Pass" }));
    expect(await screen.findByRole("heading", { name: "Bid Submitted" })).toBeInTheDocument();
    expect(screen.getByText("$900.00")).toBeInTheDocument();

    cleanup();
    apiMock.declineVendorWorkspaceBidOpportunity.mockResolvedValueOnce({
      ok: false,
      error: "bid_opportunity_expired",
      decline: null,
      bid: null,
      field_errors: {},
    });
    renderVendorWorkspace("/vendor-workspace/available-work/opaque-work-key-1");

    expect(await screen.findByRole("heading", { name: "456 Vendor Lane" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Pass Opportunity" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm Pass" }));
    expect(await screen.findByText("The bid deadline has passed.")).toBeInTheDocument();
  });

  it("renders available work detail loading and unavailable states", async () => {
    apiMock.fetchVendorWorkspaceAvailableWorkDetail.mockImplementation(() => new Promise(() => {}));
    const loadingView = renderVendorWorkspace("/vendor-workspace/available-work/opaque-work-key-1");

    expect(await screen.findByLabelText("Loading work detail")).toBeInTheDocument();
    loadingView.unmount();

    apiMock.fetchVendorWorkspaceAvailableWorkDetail.mockResolvedValue({
      ok: false,
      error: "available_work_unavailable",
      item: null,
    });
    renderVendorWorkspace("/vendor-workspace/available-work/missing-work");

    expect(await screen.findByText("Work detail unavailable")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Available Work" })).toHaveAttribute(
      "href",
      "/vendor-workspace/available-work",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("renders available work loading, error, and empty states", async () => {
    apiMock.fetchVendorWorkspaceAvailableWork.mockImplementation(() => new Promise(() => {}));
    const loadingView = renderVendorWorkspace("/vendor-workspace/available-work");

    expect(await screen.findByLabelText("Loading available work")).toBeInTheDocument();
    loadingView.unmount();

    apiMock.fetchVendorWorkspaceAvailableWork.mockRejectedValue(new Error("available work failed"));
    const errorView = renderVendorWorkspace("/vendor-workspace/available-work");

    expect(await screen.findByText("Available work unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    errorView.unmount();

    apiMock.fetchVendorWorkspaceAvailableWork.mockResolvedValue({ ok: true, items: [] });
    renderVendorWorkspace("/vendor-workspace/available-work");

    expect(
      await screen.findByText("No available work is waiting for your review. New bid opportunities will appear here when an AMC coordinator sends them to your company."),
    ).toBeInTheDocument();
  });

  it("renders My Bids loading, error, and empty states", async () => {
    apiMock.fetchVendorWorkspaceMyBids.mockImplementation(() => new Promise(() => {}));
    const loadingView = renderVendorWorkspace("/vendor-workspace/my-bids");

    expect(await screen.findByLabelText("Loading my bids")).toBeInTheDocument();
    loadingView.unmount();

    apiMock.fetchVendorWorkspaceMyBids.mockRejectedValue(new Error("my bids failed"));
    const errorView = renderVendorWorkspace("/vendor-workspace/my-bids");

    expect(await screen.findByText("My bids unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    errorView.unmount();

    apiMock.fetchVendorWorkspaceMyBids.mockResolvedValue({ ok: true, items: [] });
    renderVendorWorkspace("/vendor-workspace/my-bids");

    expect(await screen.findByText("No bids yet.")).toBeInTheDocument();
  });

  it("renders Payments loading, error, and empty states", async () => {
    apiMock.fetchVendorWorkspacePayments.mockImplementation(() => new Promise(() => {}));
    const loadingView = renderVendorWorkspace("/vendor-workspace/payments");

    expect(await screen.findByLabelText("Loading payments")).toBeInTheDocument();
    loadingView.unmount();

    apiMock.fetchVendorWorkspacePayments.mockRejectedValue(new Error("payments failed"));
    const errorView = renderVendorWorkspace("/vendor-workspace/payments");

    expect(await screen.findByText("Payment activity unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    errorView.unmount();

    apiMock.fetchVendorWorkspacePayments.mockResolvedValue({ ok: true, items: [] });
    renderVendorWorkspace("/vendor-workspace/payments");

    expect(await screen.findByText("No payment activity yet.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Review Vendor Invoices and AMC payment status for assigned Falcon AMC work. Payments are visible once assignments reach payment-eligible states.",
      ),
    ).toBeInTheDocument();
  });

  it("renders Assigned Orders loading, error, and empty states", async () => {
    apiMock.fetchVendorWorkspaceAssignedOrders.mockImplementation(() => new Promise(() => {}));
    const loadingView = renderVendorWorkspace("/vendor-workspace/assigned-orders");

    expect(await screen.findByLabelText("Loading assigned orders")).toBeInTheDocument();
    loadingView.unmount();

    apiMock.fetchVendorWorkspaceAssignedOrders.mockRejectedValue(new Error("assigned orders failed"));
    const errorView = renderVendorWorkspace("/vendor-workspace/assigned-orders");

    expect(await screen.findByText("Assigned orders unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    errorView.unmount();

    apiMock.fetchVendorWorkspaceAssignedOrders.mockResolvedValue({ ok: true, items: [] });
    renderVendorWorkspace("/vendor-workspace/assigned-orders");

    expect(await screen.findByText("No assignments yet.")).toBeInTheDocument();
  });

  it("renders assigned order detail loading and unavailable states", async () => {
    apiMock.fetchVendorWorkspaceAssignedOrderDetail.mockImplementation(() => new Promise(() => {}));
    const loadingView = renderVendorWorkspace("/vendor-workspace/assigned-orders/assigned-work-key-1");

    expect(await screen.findByLabelText("Loading assigned order detail")).toBeInTheDocument();
    loadingView.unmount();

    apiMock.fetchVendorWorkspaceAssignedOrderDetail.mockResolvedValue({
      ok: false,
      error: "assigned_order_unavailable",
      item: null,
    });
    renderVendorWorkspace("/vendor-workspace/assigned-orders/missing-assignment");

    expect(await screen.findByText("Assigned order detail unavailable")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Assignments" })).toHaveAttribute(
      "href",
      "/vendor-workspace/assigned-orders",
    );
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("renders vendor profile loading and unavailable states", async () => {
    apiMock.fetchVendorWorkspaceProfile.mockImplementation(() => new Promise(() => {}));
    const loadingView = renderVendorWorkspace("/vendor-workspace/profile");

    expect(await screen.findByLabelText("Loading vendor profile")).toBeInTheDocument();
    loadingView.unmount();

    apiMock.fetchVendorWorkspaceProfile.mockResolvedValue({
      ok: false,
      error: "vendor_profile_unavailable",
      profile: null,
    });
    renderVendorWorkspace("/vendor-workspace/profile");

    expect(
      await screen.findByText(
        "Vendor profile unavailable. Confirm your vendor profile is active or contact the AMC coordinator.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("renders loading, error, and empty states", async () => {
    apiMock.fetchVendorWorkspaceDashboardSummary.mockImplementation(() => new Promise(() => {}));
    const loadingView = renderVendorWorkspace();

    expect(await screen.findByLabelText("Loading Vendor Workspace dashboard")).toBeInTheDocument();
    loadingView.unmount();

    apiMock.fetchVendorWorkspaceDashboardSummary.mockRejectedValue(new Error("vendor dashboard failed"));
    const errorView = renderVendorWorkspace();

    expect(await screen.findByText("Vendor dashboard unavailable")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    errorView.unmount();

    apiMock.fetchVendorWorkspaceDashboardSummary.mockResolvedValue({
      ok: true,
      counts: {
        available_work: 0,
        pending_bids: 0,
        assignment_offers: 0,
        active_assigned_orders: 0,
        submitted_awaiting_review: 0,
        needs_attention: 0,
      },
      actions: [],
    });
    renderVendorWorkspace();

    expect(
      await screen.findByText("No vendor action items need attention right now."),
    ).toBeInTheDocument();
  });

  it("bootstraps authenticated vendor contact access before loading workspace data", async () => {
    renderVendorWorkspace();

    await waitFor(() => {
      expect(apiMock.bootstrapVendorWorkspace).toHaveBeenCalledTimes(1);
    });
    expect(permissionState.reload).toHaveBeenCalled();
    expect(await screen.findByRole("heading", { name: "Your work queue" })).toBeInTheDocument();
  });

  it("shows unavailable state when vendor bootstrap cannot switch active company", async () => {
    const error = new Error("Function not found");
    error.vendorWorkspaceDiagnostics = {
      bootstrap: {
        ok: true,
        vendor_company_id: "acme-company-id",
        vendor_company_name: "Acme Appraisal",
        membership_id: "membership-id",
        role_assignment_id: "role-assignment-id",
        has_vendor_workspace_view: true,
      },
      set_active_company: {
        active_company_id_sent: "acme-company-id",
        response: null,
        error: "Function not found",
      },
      session_after_refresh: {
        active_company_id: "continental-company-id",
        user_email: "chris@therossicompany.com",
      },
      permission_reload: {
        current_company_id: "continental-company-id",
        permission_keys: [],
        has_vendor_workspace_view: false,
      },
    };
    apiMock.bootstrapVendorWorkspace.mockRejectedValue(error);
    permissionState.allowed = new Set();

    renderVendorWorkspace();

    expect(await screen.findByText("Vendor Workspace unavailable")).toBeInTheDocument();
    expect(screen.getByText("Vendor Workspace diagnostics")).toBeInTheDocument();
    expect(screen.getAllByText("acme-company-id").length).toBeGreaterThan(0);
    expect(screen.getByText("Acme Appraisal")).toBeInTheDocument();
    expect(screen.getAllByText("Function not found").length).toBeGreaterThan(0);
    expect(screen.getAllByText("continental-company-id").length).toBeGreaterThan(0);
    expect(screen.getByText("chris@therossicompany.com")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Vendor Workspace" })).toBeNull();
  });

  it("requires vendor_workspace.view without redirecting unauthorized users into /dashboard", async () => {
    permissionState.allowed = new Set();

    renderVendorWorkspace();

    expect(await screen.findByText("Vendor Workspace unavailable")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Vendor Workspace" })).toBeNull();
    expect(screen.queryByTestId("location")).toBeNull();
  });

  it("redirects unauthenticated users to login only", () => {
    sessionState.user = null;

    renderVendorWorkspace();

    expect(screen.getByTestId("location")).toHaveTextContent("/login");
  });

  it.each([
    ["/orders"],
    ["/orders/amc-smoke-order-id"],
  ])(
    "keeps vendor direct navigation to %s out of shared/internal order routes",
    async (path) => {
      renderVendorRouteIsolation(path);

      expect(await screen.findByRole("heading", { name: "Your work queue" })).toBeInTheDocument();
      expect(screen.getAllByRole("link", { name: "Dashboard" })[0]).toHaveAttribute(
        "href",
        "/vendor-workspace/dashboard",
      );
      expect(screen.queryByTestId("internal-orders-data")).toBeNull();
      expect(screen.queryByTestId("internal-order-detail-data")).toBeNull();
      expect(screen.queryByText("Internal / AMC orders data")).toBeNull();
      expect(screen.queryByText("Internal / AMC order detail data")).toBeNull();
      expect(screen.queryByRole("link", { name: "Internal Operations" })).toBeNull();
      expect(screen.queryByRole("link", { name: "Falcon AMC" })).toBeNull();
    },
  );

  it("renders a safe unavailable dashboard for vendor direct navigation to /dashboard", async () => {
    renderVendorRouteIsolation("/dashboard");

    expect(await screen.findByRole("heading", { name: "Your work queue" })).toBeInTheDocument();
    expect(screen.queryByTestId("internal-orders-data")).toBeNull();
    expect(screen.queryByTestId("internal-order-detail-data")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Operations Dashboard" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Internal Operations" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Falcon AMC" })).toBeNull();
  });

  it("keeps Vendor Workspace routes usable after internal route isolation checks", async () => {
    const { container } = renderVendorRouteIsolation("/vendor-workspace/dashboard");

    expect(await screen.findByRole("heading", { name: "Your work queue" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Current Assignments" })[0]).toHaveAttribute(
      "href",
      "/vendor-workspace/assigned-orders",
    );
    expect(container.querySelector('a[href^="/orders"]')).toBeNull();
    expect(screen.queryByTestId("internal-orders-data")).toBeNull();
    expect(screen.queryByTestId("internal-order-detail-data")).toBeNull();
  });

  it("keeps dashboard source isolated from shared order/vendor/client and owner-side bid APIs", () => {
    expect(dashboardSource).not.toContain("@/features/orders");
    expect(dashboardSource).not.toContain("@/features/vendors");
    expect(dashboardSource).not.toContain("@/features/clients");
    expect(dashboardSource).not.toContain("@/features/bids");
    expect(dashboardSource).not.toContain("listOrderVendorBidRequests");
    expect(dashboardSource).not.toContain("fetchAmcOrderProcurementSummaries");
  });

  it("keeps available work source isolated from shared order/vendor/client and owner-side bid APIs", () => {
    expect(availableWorkSource).not.toContain("@/features/orders");
    expect(availableWorkSource).not.toContain("@/features/vendors");
    expect(availableWorkSource).not.toContain("@/features/clients");
    expect(availableWorkSource).not.toContain("@/features/bids");
    expect(availableWorkSource).not.toContain("listOrderVendorBidRequests");
    expect(availableWorkSource).not.toContain("fetchAmcOrderProcurementSummaries");
  });

  it("keeps available work detail source isolated from shared order/vendor/client and owner-side bid APIs", () => {
    expect(availableWorkDetailSource).not.toContain("@/features/orders");
    expect(availableWorkDetailSource).not.toContain("@/features/vendors");
    expect(availableWorkDetailSource).not.toContain("@/features/clients");
    expect(availableWorkDetailSource).not.toContain("@/features/bids");
    expect(availableWorkDetailSource).not.toContain("listOrderVendorBidRequests");
    expect(availableWorkDetailSource).not.toContain("fetchAmcOrderProcurementSummaries");
  });

  it("keeps My Bids source isolated from shared order/vendor/client and owner-side bid APIs", () => {
    expect(myBidsSource).not.toContain("@/features/orders");
    expect(myBidsSource).not.toContain("@/features/vendors");
    expect(myBidsSource).not.toContain("@/features/clients");
    expect(myBidsSource).not.toContain("@/features/bids");
    expect(myBidsSource).not.toContain("listOrderVendorBidRequests");
    expect(myBidsSource).not.toContain("fetchAmcOrderProcurementSummaries");
  });

  it("keeps Payments source isolated from shared order/vendor/client and owner-side financial APIs", () => {
    expect(paymentsSource).not.toContain("@/features/orders");
    expect(paymentsSource).not.toContain("@/features/vendors");
    expect(paymentsSource).not.toContain("@/features/clients");
    expect(paymentsSource).not.toContain("@/features/bids");
    expect(paymentsSource).not.toContain("rpc_order_vendor_bid_request");
    expect(paymentsSource).not.toContain("rpc_vendor_profile_update");
    expect(paymentsSource).not.toContain("client_fee");
    expect(paymentsSource).not.toContain("amc_margin");
  });

  it("keeps Vendor Profile source isolated from shared order/vendor/client and owner-side APIs", () => {
    expect(profileSource).not.toContain("@/features/orders");
    expect(profileSource).not.toContain("@/features/vendors");
    expect(profileSource).not.toContain("@/features/clients");
    expect(profileSource).not.toContain("@/features/bids");
    expect(profileSource).not.toContain("rpc_vendor_profile_update");
    expect(profileSource).not.toContain("rpc_vendor_service_area_create");
    expect(profileSource).not.toContain("listOrderVendorBidRequests");
    expect(profileSource).not.toContain("fetchAmcOrderProcurementSummaries");
  });

  it("keeps Assigned Orders source isolated from shared order/vendor/client and owner-side bid APIs", () => {
    expect(assignedOrdersSource).not.toContain("@/features/orders");
    expect(assignedOrdersSource).not.toContain("@/features/vendors");
    expect(assignedOrdersSource).not.toContain("@/features/clients");
    expect(assignedOrdersSource).not.toContain("@/features/bids");
    expect(assignedOrdersSource).not.toContain("listOrderVendorBidRequests");
    expect(assignedOrdersSource).not.toContain("fetchAmcOrderProcurementSummaries");
  });

  it("keeps Assigned Order Detail source isolated from shared order/vendor/client and owner-side assignment APIs", () => {
    expect(assignedOrderDetailSource).not.toContain("@/features/orders");
    expect(assignedOrderDetailSource).not.toContain("@/features/vendors");
    expect(assignedOrderDetailSource).not.toContain("@/features/clients");
    expect(assignedOrderDetailSource).not.toContain("@/features/bids");
    expect(assignedOrderDetailSource).not.toContain("rpc_order_company_assignment");
    expect(assignedOrderDetailSource).not.toContain("listOrderVendorBidRequests");
    expect(assignedOrderDetailSource).not.toContain("fetchAmcOrderProcurementSummaries");
  });
});
