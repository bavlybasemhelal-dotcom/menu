import { useEffect, useState } from "react";

export function nextScheduleBoundary(
  value: unknown,
  now = Date.now(),
): number | null {
  let next = Infinity;
  const visit = (entry: unknown) => {
    if (!entry || typeof entry !== "object") return;
    if (Array.isArray(entry)) {
      entry.forEach(visit);
      return;
    }
    const record = entry as {
      startsAt?: number | null;
      endsAt?: number | null;
      discount?: unknown;
    };
    // End times are inclusive in pricing/offer logic, so expire one millisecond later.
    for (const boundary of [
      record.startsAt,
      record.endsAt == null ? null : record.endsAt + 1,
    ]) {
      if (
        typeof boundary === "number" &&
        Number.isFinite(boundary) &&
        boundary > now
      )
        next = Math.min(next, boundary);
    }
    visit(record.discount);
  };
  visit(value);
  return Number.isFinite(next) ? next : null;
}

// Wake only the screen displaying scheduled content. Idle forms/catalogs no
// longer re-render every second, and background tabs need no recurring timer.
export function useScheduleRefresh(value: unknown) {
  const [revision, refresh] = useState(0);
  useEffect(() => {
    const next = nextScheduleBoundary(value);
    if (next === null) return;
    const update = () => refresh((v) => v + 1);
    const resume = () => {
      if (!document.hidden) update();
    };
    const timer = document.hidden
      ? null
      : setTimeout(update, Math.min(next - Date.now(), 2_147_483_647));
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", update);
    return () => {
      if (timer !== null) clearTimeout(timer);
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("focus", update);
    };
  }, [value, revision]);
}
