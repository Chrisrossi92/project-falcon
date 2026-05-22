import { describe, expect, it } from "vitest";
import { canArchiveOrder, canCancelOrder, canVoidOrder } from "../orderArchiveReadiness";
import { PERMISSIONS } from "@/lib/permissions/constants";

describe("canArchiveOrder", () => {
  const activeOrder = {
    id: "order-1",
    is_archived: false,
    status: "in_progress",
  };

  it("allows archive readiness when the readable order is active and permission is present", () => {
    expect(
      canArchiveOrder(activeOrder, {
        hasPermission: (permissionKey) => permissionKey === PERMISSIONS.ORDERS_ARCHIVE,
      }),
    ).toBe(true);
  });

  it("supports permission sets from useEffectivePermissions", () => {
    expect(
      canArchiveOrder(activeOrder, {
        permissionSet: new Set([PERMISSIONS.ORDERS_ARCHIVE]),
      }),
    ).toBe(true);
  });

  it("supports plain permission arrays for tests and diagnostics", () => {
    expect(canArchiveOrder(activeOrder, [PERMISSIONS.ORDERS_ARCHIVE])).toBe(true);
  });

  it("denies archive readiness without orders.archive", () => {
    expect(
      canArchiveOrder(activeOrder, {
        hasPermission: () => false,
      }),
    ).toBe(false);
  });

  it("denies archive readiness while permissions are loading or errored", () => {
    expect(
      canArchiveOrder(activeOrder, {
        loading: true,
        hasPermission: () => true,
      }),
    ).toBe(false);

    expect(
      canArchiveOrder(activeOrder, {
        error: new Error("permission resolver failed"),
        hasPermission: () => true,
      }),
    ).toBe(false);
  });

  it("denies archive readiness for missing or already archived orders", () => {
    expect(canArchiveOrder(null, [PERMISSIONS.ORDERS_ARCHIVE])).toBe(false);
    expect(
      canArchiveOrder(
        {
          ...activeOrder,
          is_archived: true,
        },
        [PERMISSIONS.ORDERS_ARCHIVE],
      ),
    ).toBe(false);
  });

  it("does not use order status as archive authority", () => {
    expect(
      canArchiveOrder(
        {
          ...activeOrder,
          status: "completed",
        },
        [PERMISSIONS.ORDERS_ARCHIVE],
      ),
    ).toBe(true);
  });

  it("denies archive readiness after cancel or void terminal status", () => {
    expect(canArchiveOrder({ ...activeOrder, status: "cancelled" }, [PERMISSIONS.ORDERS_ARCHIVE]))
      .toBe(false);
    expect(canArchiveOrder({ ...activeOrder, status: "voided" }, [PERMISSIONS.ORDERS_ARCHIVE]))
      .toBe(false);
  });
});

describe("future cancel/void order readiness", () => {
  const activeOrder = {
    id: "order-1",
    is_archived: false,
    status: "in_progress",
  };

  it("allows cancel readiness only when the order is active and orders.cancel is present", () => {
    expect(canCancelOrder(activeOrder, [PERMISSIONS.ORDERS_CANCEL])).toBe(true);
    expect(canCancelOrder(activeOrder, [PERMISSIONS.ORDERS_VOID])).toBe(false);
  });

  it("allows void readiness only when the order is active and orders.void is present", () => {
    expect(canVoidOrder(activeOrder, [PERMISSIONS.ORDERS_VOID])).toBe(true);
    expect(canVoidOrder(activeOrder, [PERMISSIONS.ORDERS_CANCEL])).toBe(false);
  });

  it("supports useEffectivePermissions-style permission objects", () => {
    expect(
      canCancelOrder(activeOrder, {
        hasPermission: (permissionKey) => permissionKey === PERMISSIONS.ORDERS_CANCEL,
      }),
    ).toBe(true);

    expect(
      canVoidOrder(activeOrder, {
        permissionSet: new Set([PERMISSIONS.ORDERS_VOID]),
      }),
    ).toBe(true);
  });

  it("denies cancel and void readiness for missing or archived orders", () => {
    expect(canCancelOrder(null, [PERMISSIONS.ORDERS_CANCEL])).toBe(false);
    expect(canVoidOrder(null, [PERMISSIONS.ORDERS_VOID])).toBe(false);
    expect(canCancelOrder({ ...activeOrder, is_archived: true }, [PERMISSIONS.ORDERS_CANCEL])).toBe(
      false,
    );
    expect(canVoidOrder({ ...activeOrder, is_archived: true }, [PERMISSIONS.ORDERS_VOID])).toBe(
      false,
    );
  });

  it("denies cancel and void readiness while permissions are loading or errored", () => {
    expect(
      canCancelOrder(activeOrder, {
        loading: true,
        hasPermission: () => true,
      }),
    ).toBe(false);

    expect(
      canVoidOrder(activeOrder, {
        error: new Error("permission resolver failed"),
        hasPermission: () => true,
      }),
    ).toBe(false);
  });

  it("keeps non-terminal status from becoming cancel or void authority", () => {
    expect(
      canCancelOrder(
        {
          ...activeOrder,
          status: "completed",
        },
        [PERMISSIONS.ORDERS_CANCEL],
      ),
    ).toBe(true);

    expect(
      canVoidOrder(
        {
          ...activeOrder,
          status: "completed",
        },
        [PERMISSIONS.ORDERS_VOID],
      ),
    ).toBe(true);
  });

  it("denies cancel and void readiness after cancel or void terminal status", () => {
    expect(
      canCancelOrder({ ...activeOrder, status: "cancelled" }, [PERMISSIONS.ORDERS_CANCEL]),
    ).toBe(false);
    expect(canVoidOrder({ ...activeOrder, status: "cancelled" }, [PERMISSIONS.ORDERS_VOID])).toBe(
      false,
    );
    expect(canCancelOrder({ ...activeOrder, status: "voided" }, [PERMISSIONS.ORDERS_CANCEL])).toBe(
      false,
    );
    expect(canVoidOrder({ ...activeOrder, status: "voided" }, [PERMISSIONS.ORDERS_VOID])).toBe(
      false,
    );
  });
});
