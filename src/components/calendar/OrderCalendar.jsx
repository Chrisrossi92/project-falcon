import { useCalendarEvents } from "@/hooks/useCalendarEvents";

export default function OrderCalendar() {
  const { events, loading, refresh } = useCalendarEvents();

  return (
    <div className="border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Order Calendar</h3>
        <button className="text-sm underline" onClick={refresh}>Refresh</button>
      </div>
      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : events.length === 0 ? (
        <div className="text-sm text-gray-500">No events to show.</div>
      ) : (
        <ul className="space-y-2">
          {events.map((e) => (
            <li key={`${e.order_id}-${e.kind}-${e.starts_at}`} className="p-2 rounded-lg border">
              <div className="text-sm font-medium">{e.title} <span className="ml-2 text-xs px-2 py-0.5 rounded-full border">{e.kind}</span></div>
              <div className="text-xs text-gray-600">
                {new Date(e.starts_at).toLocaleString()}
                {e.ends_at && ` – ${new Date(e.ends_at).toLocaleString()}`}
              </div>
              <a className="text-xs underline mt-1 inline-block" href={`/orders/${e.order_id}`}>
                Open order
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
