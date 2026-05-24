import { describe, expect, it } from "vitest";
import { deriveFileReadinessSummary } from "../deriveFileReadinessSummary";

const NOW = new Date("2026-05-24T12:00:00.000Z");

function document(overrides = {}) {
  return {
    id: "doc-1",
    status: "active",
    category: "source_documents",
    created_at: "2026-05-18T12:00:00.000Z",
    ...overrides,
  };
}

describe("deriveFileReadinessSummary", () => {
  it("flags no supporting files when loaded document context is empty", () => {
    expect(deriveFileReadinessSummary({ documents: [], now: NOW })).toMatchObject({
      id: "no_files_loaded",
      tone: "attention",
      label: "No files loaded",
      message: "No supporting files loaded yet.",
    });
  });

  it("flags limited file coverage for one loaded document", () => {
    expect(
      deriveFileReadinessSummary({ documents: [document()], now: NOW }),
    ).toMatchObject({
      id: "limited_files_present",
      tone: "neutral",
      message: "Limited supporting files uploaded so far.",
      details: ["1 supporting file loaded."],
    });
  });

  it("flags multiple supporting files", () => {
    expect(
      deriveFileReadinessSummary({
        documents: [
          document({ id: "doc-1" }),
          document({ id: "doc-2" }),
          document({ id: "doc-3" }),
        ],
        now: NOW,
      }),
    ).toMatchObject({
      id: "multiple_files_present",
      tone: "ready",
      message: "Multiple supporting documents are available.",
    });
  });

  it("flags recent uploads from loaded document metadata", () => {
    expect(
      deriveFileReadinessSummary({
        documents: [document({ created_at: "2026-05-23T12:00:00.000Z" })],
        now: NOW,
      }),
    ).toMatchObject({
      id: "recent_file_uploads",
      tone: "ready",
      message: "Recent document uploads detected.",
    });
  });

  it("summarizes a mixed document category set", () => {
    const result = deriveFileReadinessSummary({
      documents: [
        document({ id: "doc-1", category: "engagement" }),
        document({ id: "doc-2", category: "source_documents" }),
        document({ id: "doc-3", category: "property_media" }),
      ],
      now: NOW,
    });

    expect(result.details).toContain(
      "File mix includes Engagement, Property Media, Source Documents.",
    );
  });

  it("uses explicit row document counts without inventing document records", () => {
    expect(
      deriveFileReadinessSummary({
        order: { id: "order-1", status: "in_review", document_count: 2 },
        now: NOW,
      }),
    ).toMatchObject({
      id: "documents_available_for_review",
      message: "Documents are available for review.",
      details: ["2 supporting files loaded."],
    });
  });

  it("returns null when no document metadata or explicit count is loaded", () => {
    expect(
      deriveFileReadinessSummary({
        order: { id: "order-1", status: "in_progress" },
        now: NOW,
      }),
    ).toBeNull();
  });
});
