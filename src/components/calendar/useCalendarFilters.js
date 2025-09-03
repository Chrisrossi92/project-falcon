// src/components/calendar/useCalendarFilters.js
import { useMemo, useState, useCallback } from "react";

/**
 * Keeps type/mine filters and exposes a predicate.
 * Types: site_visit, due_for_review, due_to_client
 */
export default function useCalendarFilters({ defaultMine = false } = {}) {
  const [site, setSite]     = useState(true);
  const [review, setRev]    = useState(true);
  const [finalD, setFinal]  = useState(true);
  const [mine, setMine]     = useState(defaultMine);

  const toggleSite  = useCallback(() => setSite(s => !s), []);
  const toggleRev   = useCallback(() => setRev(s => !s), []);
  const toggleFinal = useCallback(() => setFinal(s => !s), []);
  const toggleMine  = useCallback(() => setMine(s => !s), []);

  const predicate = useCallback((ev, meId) => {
    // type filter
    if (ev.type === "site_visit"     && !site)   return false;
    if (ev.type === "due_for_review" && !review) return false;
    if (ev.type === "due_to_client"  && !finalD) return false;
    // mine filter (optional)
    if (mine && meId && ev.appraiser) {
      // loose match on name when we don’t have IDs here; you can swap to id check in PR 3
      if (!String(ev.appraiser).toLowerCase().includes(String(meId).toLowerCase())) return false;
    }
    return true;
  }, [site, review, finalD, mine]);

  const chips = useMemo(() => ([
    { key: "site",   label: "Site",   active: site,   onClick: toggleSite,  color: "bg-pink-500/80"  },
    { key: "review", label: "Review", active: review, onClick: toggleRev,   color: "bg-amber-500/80" },
    { key: "final",  label: "Final",  active: finalD, onClick: toggleFinal, color: "bg-blue-500/80"  },
    { key: "mine",   label: "Mine",   active: mine,   onClick: toggleMine,  color: "bg-slate-400/80" },
  ]), [site, review, finalD, mine, toggleSite, toggleRev, toggleFinal, toggleMine]);

  return { site, review, finalD, mine, toggleSite, toggleRev, toggleFinal, toggleMine, predicate, chips };
}
