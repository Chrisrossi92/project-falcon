const placeholderCards = Object.freeze([
  "Available Work",
  "My Bids",
  "Assigned Orders",
  "Documents / Tasks",
  "Profile",
]);

export default function VendorWorkspaceDashboard() {
  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Authenticated vendor access
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-950">Vendor Workspace</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Manage available work, bids, assignments, documents, and profile details.
        </p>
      </section>

      <section aria-label="Vendor workspace placeholders" className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {placeholderCards.map((card) => (
          <article key={card} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-950">{card}</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Future vendor workspace surface.
            </p>
          </article>
        ))}
      </section>
    </div>
  );
}
