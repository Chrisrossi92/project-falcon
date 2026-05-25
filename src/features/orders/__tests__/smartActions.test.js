import { describe, expect, it, vi } from "vitest";

import { ORDER_STATUS } from "@/lib/constants/orderStatus";
import { getSmartOrderActions } from "../smartActions";

describe("getSmartOrderActions", () => {
  it("keeps appraiser send-to-review action permission scoped", () => {
    const onSendToReview = vi.fn();
    const allowedActions = getSmartOrderActions({
      order: { id: "order-1", status: ORDER_STATUS.IN_PROGRESS },
      role: "appraiser",
      permissions: {
        canSubmitToReview: true,
      },
      handlers: {
        onSendToReview,
      },
    });

    expect(allowedActions).toEqual([
      expect.objectContaining({
        id: "send_to_review",
        label: "Send to Review",
        visible: true,
        isPrimary: true,
      }),
    ]);

    const blockedActions = getSmartOrderActions({
      order: { id: "order-1", status: ORDER_STATUS.IN_PROGRESS },
      role: "appraiser",
      permissions: {
        canSubmitToReview: false,
      },
      handlers: {
        onSendToReview,
      },
    });

    expect(blockedActions).toEqual([
      expect.objectContaining({
        id: "send_to_review",
        visible: false,
      }),
    ]);
  });
});
