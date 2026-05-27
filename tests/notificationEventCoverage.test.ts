import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  NOTIFICATION_EVENT_KEYS,
  getNotificationEvent,
} from "@/features/notifications/notificationEvents";
import { emitNotification } from "@/lib/services/notificationsService";
import { supabase } from "@/lib/supabaseClient";

vi.mock("@/lib/supabaseClient", () => {
  const client = {
    from: vi.fn(),
    rpc: vi.fn(),
  };
  return {
    default: client,
    supabase: client,
  };
});

const mockedSupabase = vi.mocked(supabase);

const REQUIRED_V1_EVENTS = [
  "order.assigned_appraiser",
  "order.reassigned_appraiser",
  "order.assigned_reviewer",
  "order.reassigned_reviewer",
  "order.sent_to_review",
  "order.resubmitted_to_review",
  "order.sent_back_to_appraiser",
  "order.review_cleared",
  "order.ready_for_client",
  "order.completed",
  "order.dates_updated",
  "order.site_visit_updated",
  "note.added",
  "user.invited",
  "user.access_changed",
];

function policyQuery() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: {
        rules: {
          category: "workflow",
          priority: "high",
          roles: {
            appraiser: { in_app: { default: true, required: true } },
          },
        },
      },
      error: null,
    }),
  };
}

function usersQuery() {
  return {
    select: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { id: "appraiser-1", auth_id: "auth-appraiser-1" },
      error: null,
    }),
  };
}

describe("V1 notification event coverage", () => {
  const migration = readFileSync(
    "supabase/migrations/20260527093000_notification_v1_event_coverage_order_safe_links.sql",
    "utf8",
  );
  const policySql = [
    migration,
    readFileSync("supabase/migrations/20260518002000_baseline_static_seed_data.sql", "utf8"),
  ].join("\n");

  it("registers all required V1 event keys", () => {
    expect(Object.values(NOTIFICATION_EVENT_KEYS)).toEqual(
      expect.arrayContaining(REQUIRED_V1_EVENTS),
    );

    for (const eventKey of REQUIRED_V1_EVENTS) {
      expect(getNotificationEvent(eventKey), eventKey).toBeTruthy();
    }
  });

  it("seeds backend policies for all new V1 event keys", () => {
    for (const eventKey of REQUIRED_V1_EVENTS) {
      expect(policySql, eventKey).toContain(`'${eventKey}'`);
    }
  });

  it("keeps backend assignment/date notifications on order-safe links", () => {
    expect(migration).toContain("'/orders/' || v_order.id::text");
    expect(migration).toContain("after insert or update of appraiser_id, reviewer_id");
    expect(migration).toContain("after update of site_visit_at, review_due_at, final_due_at");
    expect(migration).toContain("order.assigned_appraiser");
    expect(migration).toContain("order.reassigned_reviewer");
    expect(migration).toContain("order.site_visit_updated");
    expect(migration).toContain("order.dates_updated");
  });

  it("reroutes hidden assignment notification links away from hidden V1 routes", () => {
    expect(migration).toContain("tg_notifications_v1_order_safe_links");
    expect(migration).toContain("NEW.link_path := '/orders/' || v_order_id::text");
    expect(migration).toContain("v1_hidden_surface_link_rerouted");
  });
});

describe("emitNotification V1 order links", () => {
  it("routes order notifications to /orders/:id", async () => {
    mockedSupabase.from.mockImplementation((table: string) => {
      if (table === "notification_policies") return policyQuery();
      if (table === "users") return usersQuery();
      throw new Error(`Unexpected table ${table}`);
    });
    mockedSupabase.rpc.mockResolvedValue({ data: null, error: null });

    await emitNotification("order.assigned_appraiser", {
      recipients: [{ userId: "appraiser-1", role: "appraiser" }],
      order: {
        id: "order-1",
        order_number: "2026004",
        client_name: "Continental",
      },
      payload: {},
    });

    expect(mockedSupabase.rpc).toHaveBeenCalledWith("rpc_notification_create", {
      patch: expect.objectContaining({
        type: "order.assigned_appraiser",
        order_id: "order-1",
        link_path: "/orders/order-1",
      }),
    });
  });
});
