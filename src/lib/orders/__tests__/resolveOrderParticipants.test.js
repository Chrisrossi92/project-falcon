import { describe, expect, it } from "vitest";
import { resolveOrderParticipants } from "../resolveOrderParticipants";

const order = {
  id: "order-1",
  appraiser_id: "appraiser-1",
  reviewer_id: "reviewer-1",
};

describe("resolveOrderParticipants", () => {
  it("does not notify reviewers for appraiser notes before review workflow starts", () => {
    expect(
      resolveOrderParticipants(
        { ...order, status: "in_progress" },
        {
          actorUserId: "appraiser-1",
          actorRole: "appraiser",
          event: "activity_note",
        },
      ),
    ).toMatchObject({
      actor: { roleOnOrder: "appraiser" },
      recipients: [],
      suppressUserIds: ["appraiser-1"],
    });
  });

  it("notifies reviewers for appraiser notes once the order is in review workflow", () => {
    expect(
      resolveOrderParticipants(
        { ...order, status: "in_review" },
        {
          actorUserId: "appraiser-1",
          actorRole: "appraiser",
          event: "activity_note",
        },
      ).recipients,
    ).toEqual(["reviewer-1"]);

    expect(
      resolveOrderParticipants(
        { ...order, status: "needs_revisions" },
        {
          actorUserId: "appraiser-1",
          actorRole: "appraiser",
          event: "activity_note",
        },
      ).recipients,
    ).toEqual(["reviewer-1"]);
  });

  it("keeps submit-to-review workflow notifications routed to the assigned reviewer", () => {
    expect(
      resolveOrderParticipants(
        { ...order, status: "in_review" },
        {
          actorUserId: "appraiser-1",
          actorRole: "appraiser",
          event: "workflow.sent_to_review",
        },
      ).recipients,
    ).toEqual(["reviewer-1"]);
  });

  it("keeps reviewer notes routed to the assigned appraiser", () => {
    expect(
      resolveOrderParticipants(
        { ...order, status: "needs_revisions" },
        {
          actorUserId: "reviewer-1",
          actorRole: "reviewer",
          event: "activity_note",
        },
      ).recipients,
    ).toEqual(["appraiser-1"]);
  });
});
