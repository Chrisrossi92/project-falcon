import { deriveOrderRowNextStep } from "./deriveOrderRowNextStep";

const TONE_CLASSES = Object.freeze({
  critical: "border-rose-200 bg-rose-50 text-rose-800",
  attention: "border-amber-200 bg-amber-50 text-amber-800",
  neutral: "border-slate-200 bg-slate-50 text-slate-600",
});

export default function OrderRowNextStep({ order } = {}) {
  const signal = deriveOrderRowNextStep(order);
  if (!signal) return null;

  return (
    <div
      aria-label="Order row next step"
      className="mt-2 flex min-w-0 justify-start"
    >
      <div
        className={`inline-flex max-w-full items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${
          TONE_CLASSES[signal.tone] || TONE_CLASSES.neutral
        }`}
      >
        <span className="shrink-0 font-semibold">{signal.label}</span>
        <span className="min-w-0 truncate">{signal.message}</span>
      </div>
    </div>
  );
}
