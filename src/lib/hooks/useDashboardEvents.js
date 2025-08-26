// src/lib/hooks/useDashboardEvents.js
import { useMemo } from "react";

/**
 * Build dashboard events from orders array.
 * Supports your three types only:
 *  - site_visit_at / inspection_date -> "site_visit"
 *  - review_due_at -> "review_due"
 *  - due_to_client / client_due_date / due_date -> "client_due"
 */
export function useDashboardEvents(orders = []) {
  return useMemo(() => {
    const events = [];

    for (const o of orders) {
      const addr =
        o.address ||
        o.property_address ||
        o.property_street ||
        o.street_address ||
        "";
      const client = o.client_name || o.client || "";
      const who =
        o.appraiser_name ||
        o.assigned_appraiser_name ||
        o.appraiserId ||
        "";

      // 📍 Site Visit
      const site =
        o.site_visit_at ||
        o.site_visit_date ||
        o.inspection_date ||
        o.inspection_at;
      if (site) {
        events.push({
          id: `${o.id}-site`,
          type: "site_visit",
          at: site,
          label: `📍 ${addr || "Site Visit"}`,
          meta: { orderId: o.id, client, who },
        });
      }

      // 🧐 Due for Review
      const review = o.review_due_at || o.reviewer_due_at || o.due_for_review;
      if (review) {
        events.push({
          id: `${o.id}-review`,
          type: "review_due",
          at: review,
          label: `🧐 Review Due — ${addr || "Order"}`,
          meta: { orderId: o.id, client, who },
        });
      }

      // 🚨 Due to Client
      const clientDue = o.due_to_client || o.client_due_date || o.due_date;
      if (clientDue) {
        events.push({
          id: `${o.id}-clientdue`,
          type: "client_due",
          at: clientDue,
          label: `🚨 Due to Client — ${addr || "Order"}`,
          meta: { orderId: o.id, client, who },
        });
      }
    }

    // normalize & sort
    const norm = events
      .map((e) => ({
        ...e,
        date: new Date(e.at),
        isValid: e.at && !Number.isNaN(new Date(e.at).getTime()),
      }))
      .filter((e) => e.isValid)
      .sort((a, b) => a.date - b.date);

    return norm;
  }, [orders]);
}

export default useDashboardEvents;
