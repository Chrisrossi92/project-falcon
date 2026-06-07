import { Link } from "react-router-dom";

export default function ClientPortalNewOrderPage() {
  return (
    <div className="grid gap-6">
      <section className="grid gap-2">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Order Appraisal
        </div>
        <h1 className="text-2xl font-semibold text-slate-950">Request an appraisal</h1>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          Client portal intake is staged for a later slice. Existing appraisal requests remain
          handled through your appraisal team until the guarded intake RPC and validation flow are
          ready.
        </p>
      </section>

      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-base font-semibold text-slate-950">Intake not wired yet</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This page is a safe placeholder. It does not create orders, upload documents, or submit
          client information.
        </p>
        <Link
          to="/client-portal/orders"
          className="mt-4 inline-flex rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
        >
          Back to orders
        </Link>
      </section>
    </div>
  );
}
