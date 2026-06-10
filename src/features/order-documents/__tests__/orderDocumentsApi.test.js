import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseClient", () => ({
  default: {
    functions: {
      invoke: vi.fn(),
    },
    rpc: vi.fn(),
  },
}));

const supabase = (await import("@/lib/supabaseClient")).default;
const { createOrderDocumentDownloadUrl } = await import("../api");

describe("orderDocumentsApi", () => {
  beforeEach(() => {
    supabase.functions.invoke.mockReset();
    supabase.rpc.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests order document downloads through the Edge Function with metadata only", async () => {
    const response = {
      ok: true,
      signed_url: "https://example.test/signed-report-download",
      expires_in: 300,
      document: {
        id: "11111111-1111-4111-8111-111111111111",
        file_name: "submitted-report.pdf",
      },
    };
    supabase.functions.invoke.mockResolvedValue({ data: response, error: null });

    await expect(
      createOrderDocumentDownloadUrl("11111111-1111-4111-8111-111111111111"),
    ).resolves.toEqual(response);

    expect(supabase.functions.invoke).toHaveBeenCalledWith("order-document-download-url", {
      body: {
        document_id: "11111111-1111-4111-8111-111111111111",
      },
    });
    expect(JSON.stringify(supabase.functions.invoke.mock.calls[0][1].body)).not.toMatch(
      /storage_bucket|storage_path|file|blob/i,
    );
  });

  it("surfaces structured Edge Function errors and logs safe request diagnostics", async () => {
    const response = new globalThis.Response(
      JSON.stringify({
        ok: false,
        code: "download_not_authorized",
        message: "You cannot download this document.",
      }),
      { status: 403, statusText: "Forbidden" },
    );
    const error = new Error("Edge Function returned a non-2xx status code");
    error.context = response;
    supabase.functions.invoke.mockResolvedValue({ data: null, error });

    await expect(
      createOrderDocumentDownloadUrl("11111111-1111-4111-8111-111111111111"),
    ).rejects.toThrow("You cannot download this document.");

    expect(console.error).toHaveBeenCalledWith(
      "[OrderDocumentDownload] Edge Function request failed",
      expect.objectContaining({
        function_name: "order-document-download-url",
        status: 403,
        status_text: "Forbidden",
        body_keys: ["document_id"],
      }),
    );
  });
});
