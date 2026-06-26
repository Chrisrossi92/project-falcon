import { Link } from "react-router-dom";

const PAGE_COPY = Object.freeze({
  historicalAssignments: {
    eyebrow: "Historical Assignments",
    title: "Historical assignments",
    body: "Completed assignment history will live here as Falcon expands the vendor workspace.",
  },
  documents: {
    eyebrow: "Documents",
    title: "Documents",
    body: "Vendor-safe assignment documents, report packages, and shared files will be organized here in a future workspace slice.",
  },
  credentials: {
    eyebrow: "Credentials",
    title: "Credentials",
    body: "License, insurance, and credential records will be managed here without changing assignment workflows.",
  },
});

export default function VendorWorkspacePlaceholderPage({ page = "documents" }) {
  const copy = PAGE_COPY[page] || PAGE_COPY.documents;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {copy.eyebrow}
      </div>
      <h1 className="mt-2 text-2xl font-semibold text-slate-950">{copy.title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{copy.body}</p>
      <div className="mt-5">
        <Link
          to="/vendor-workspace/dashboard"
          className="inline-flex rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
        >
          Back to Dashboard
        </Link>
      </div>
    </section>
  );
}
