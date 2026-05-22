import { Link } from "react-router-dom";

export default function OrderOpenFullLink({ orderId, className = "" }) {
  if (!orderId) return null;
  return (
    <div className={`w-full flex justify-end ${className}`}>
      <Link
        to={`/orders/${orderId}`}
        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
        title="Open full order details"
      >
        Open full order ↗
      </Link>
    </div>
  );
}
