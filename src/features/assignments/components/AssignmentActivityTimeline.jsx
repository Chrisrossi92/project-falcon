import { useCallback, useEffect, useState } from "react";
import { Clock3 } from "lucide-react";

import { listAssignmentActivity } from "../api";
import { formatDateTime, humanize } from "../assignmentFormat";
import { ActionButton } from "../AssignmentPrimitives";

const EVENT_LABELS = {
  "assignment.offered": "Assignment offered",
  "assignment.accepted": "Assignment accepted",
  "assignment.declined": "Assignment declined",
  "assignment.started": "Assignment started",
  "assignment.submitted": "Assignment submitted",
  "assignment.completed": "Assignment completed",
  "assignment.cancelled": "Assignment cancelled",
  "assignment.revoked": "Assignment revoked",
};

function eventLabel(eventType) {
  return EVENT_LABELS[eventType] || humanize(eventType || "assignment event");
}

function actorLabel(event) {
  const company = event.actor_company_name || "Company";
  const side = event.actor_side ? humanize(event.actor_side) : "Assignment";
  return `${company} · ${side}`;
}

export default function AssignmentActivityTimeline({ assignmentId, refreshKey }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadActivity = useCallback(async () => {
    if (!assignmentId) {
      setEvents([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      setEvents(await listAssignmentActivity(assignmentId));
    } catch (err) {
      setError(err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    loadActivity();
  }, [loadActivity, refreshKey]);

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">Assignment Activity</h2>
          <p className="mt-1 text-xs text-slate-500">Assignment-scoped lifecycle history for this packet.</p>
        </div>
        <Clock3 className="h-4 w-4 text-slate-400" aria-hidden="true" />
      </div>

      {loading ? (
        <div className="mt-3 space-y-2" aria-live="polite" aria-busy="true">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-14 animate-pulse rounded-md bg-slate-100" />
          ))}
        </div>
      ) : error ? (
        <div className="mt-3 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <p>Assignment activity unavailable. No order activity fallback was attempted.</p>
          <div className="mt-2">
            <ActionButton variant="secondary" onClick={loadActivity}>Retry</ActionButton>
          </div>
        </div>
      ) : events.length === 0 ? (
        <p className="mt-3 rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-500">
          No assignment activity recorded yet.
        </p>
      ) : (
        <ol className="mt-3 space-y-2">
          {events.map((event) => (
            <li key={event.id} className="rounded-md border border-slate-100 bg-white px-3 py-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800">{eventLabel(event.event_type)}</div>
                  <div className="mt-0.5 text-xs font-medium text-slate-500">{actorLabel(event)}</div>
                </div>
                <time className="text-xs text-slate-500" dateTime={event.created_at}>
                  {formatDateTime(event.created_at)}
                </time>
              </div>
              {event.message && <p className="mt-2 text-sm leading-6 text-slate-700">{event.message}</p>}
              {event.event_note && (
                <p className="mt-2 rounded-md bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600">
                  {event.event_note}
                </p>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
