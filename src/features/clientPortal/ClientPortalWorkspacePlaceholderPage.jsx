import { Link } from "react-router-dom";

const PAGE_COPY = Object.freeze({
  historicalOrders: {
    eyebrow: "Historical Orders",
    title: "Historical appraisals",
    body: "Completed appraisal history will live here as Falcon expands the client workspace.",
  },
  documents: {
    eyebrow: "Documents",
    title: "Documents",
    body: "Client-safe reports and shared files will be organized here when document workspace access is enabled.",
  },
  profile: {
    eyebrow: "Profile",
    title: "Client profile",
    body: "Account contacts and delivery preferences will be managed here in a future client workspace slice.",
  },
});

export default function ClientPortalWorkspacePlaceholderPage({ page = "documents" }) {
  const copy = PAGE_COPY[page] || PAGE_COPY.documents;

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {copy.eyebrow}
      </div>
      <h1 className="mt-2 text-2xl font-semibold text-slate-950">{copy.title}</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{copy.body}</p>
      <div className="mt-5">
        <Link
          to="/client-portal"
          className="inline-flex rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
        >
          Back to Dashboard
        </Link>
      </div>
    </section>
  );
}
