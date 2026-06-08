// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseClient", () => ({
  default: {
    rpc: vi.fn(),
  },
}));

const supabase = (await import("@/lib/supabaseClient")).default;
const {
  clientPortalInvitationRpcNames,
  createClientContact,
  createClientPortalInvitation,
  listClientContacts,
  normalizeClientPortalInvitation,
  setClientContactStatus,
  setDefaultClientContact,
  updateClientContact,
} = await import("../clientContactsApi");

describe("clientContactsApi", () => {
  beforeEach(() => {
    supabase.rpc.mockReset();
  });

  it("lists normalized reusable client contacts", async () => {
    supabase.rpc.mockResolvedValue({
      data: [
        {
          contact_id: 12,
          company_id: "company-1",
          client_id: 34,
          name: "Avery Desk",
          title: "AMC Coordinator",
          email: "avery@example.test",
          phone: "555-0100",
          notes: "Portal messages preferred.",
          status: "active",
          is_default: true,
        },
      ],
      error: null,
    });

    await expect(listClientContacts(34)).resolves.toEqual([
      expect.objectContaining({
        id: 12,
        contact_id: 12,
        client_id: 34,
        name: "Avery Desk",
        title: "AMC Coordinator",
        is_default: true,
      }),
    ]);
    expect(supabase.rpc).toHaveBeenCalledWith("rpc_client_contact_list", {
      p_client_id: 34,
    });
  });

  it("creates, updates, changes status, and sets default through narrow RPCs", async () => {
    supabase.rpc.mockResolvedValue({
      data: { contact_id: 12, client_id: 34, name: "Avery Desk", status: "active" },
      error: null,
    });

    await createClientContact(34, { name: "Avery Desk" });
    expect(supabase.rpc).toHaveBeenLastCalledWith("rpc_client_contact_create", {
      p_client_id: 34,
      p_contact: { name: "Avery Desk" },
    });

    await updateClientContact(12, { title: "Coordinator" });
    expect(supabase.rpc).toHaveBeenLastCalledWith("rpc_client_contact_update", {
      p_contact_id: 12,
      p_patch: { title: "Coordinator" },
    });

    await setClientContactStatus(12, "inactive");
    expect(supabase.rpc).toHaveBeenLastCalledWith("rpc_client_contact_set_status", {
      p_contact_id: 12,
      p_status: "inactive",
    });

    await setDefaultClientContact(12);
    expect(supabase.rpc).toHaveBeenLastCalledWith("rpc_client_contact_set_default", {
      p_contact_id: 12,
    });
  });

  it("creates a minimal default contact suitable for portal invitation", async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        contact_id: 22,
        company_id: "company-1",
        client_id: 34,
        name: "Dana Miller",
        email: "dmiller@firstbank.com",
        phone: null,
        title: null,
        status: "active",
        is_default: true,
      },
      error: null,
    });

    await expect(
      createClientContact(34, {
        name: "Dana Miller",
        email: "dmiller@firstbank.com",
        title: null,
        phone: null,
        is_default: true,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        contact_id: 22,
        client_id: 34,
        name: "Dana Miller",
        email: "dmiller@firstbank.com",
        is_default: true,
      }),
    );

    expect(supabase.rpc).toHaveBeenCalledWith("rpc_client_contact_create", {
      p_client_id: 34,
      p_contact: {
        name: "Dana Miller",
        email: "dmiller@firstbank.com",
        title: null,
        phone: null,
        is_default: true,
      },
    });
  });

  it("sets a default client contact through the dedicated scoped RPC", async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        contact_id: 21,
        company_id: "company-1",
        client_id: 34,
        name: "Dana Miller",
        email: "dana@example.test",
        status: "active",
        is_default: true,
      },
      error: null,
    });

    await expect(setDefaultClientContact(21)).resolves.toEqual(
      expect.objectContaining({
        contact_id: 21,
        client_id: 34,
        name: "Dana Miller",
        status: "active",
        is_default: true,
      }),
    );
    expect(supabase.rpc).toHaveBeenCalledWith("rpc_client_contact_set_default", {
      p_contact_id: 21,
    });
  });

  it("creates client portal invitations through the dedicated invite RPC", async () => {
    supabase.rpc.mockResolvedValue({
      data: {
        invitation_id: "invite-1",
        client_id: 34,
        client_name: "First Buckeye Bank",
        client_contact_id: 21,
        contact_name: "Dana Miller",
        email: "dana@example.test",
        status: "pending",
        expires_at: "2026-06-22T12:00:00Z",
        token_last_four: "abcd",
        invitation_token: "f".repeat(64),
      },
      error: null,
    });

    await expect(
      createClientPortalInvitation({
        clientId: 34,
        contactId: 21,
        email: "dana@example.test",
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        invitationId: "invite-1",
        clientId: 34,
        clientName: "First Buckeye Bank",
        contactId: 21,
        contactName: "Dana Miller",
        email: "dana@example.test",
        status: "pending",
        expiresAt: "2026-06-22T12:00:00Z",
        tokenLastFour: "abcd",
        inviteLink: `${window.location.origin}/client-portal/invitations/${"f".repeat(64)}`,
      }),
    );

    expect(supabase.rpc).toHaveBeenCalledWith(clientPortalInvitationRpcNames.create, {
      p_client_id: 34,
      p_client_contact_id: 21,
      p_email: "dana@example.test",
    });
  });

  it("normalizes returned invitation paths without persisting raw token separately", () => {
    expect(
      normalizeClientPortalInvitation({
        invitation_path: "/client-portal/invitations/raw-token",
        email: "dana@example.test",
      }),
    ).toEqual(
      expect.objectContaining({
        email: "dana@example.test",
        inviteLink: `${window.location.origin}/client-portal/invitations/raw-token`,
      }),
    );
  });
});
