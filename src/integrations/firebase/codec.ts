import { Timestamp } from "firebase/firestore";
export function decode(value: unknown): unknown {
  if (value instanceof Timestamp) return value.toMillis();
  if (Array.isArray(value)) return value.map(decode);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, decode(v)]),
    );
  return value;
}
export function encode(
  value: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [
      k,
      [
        "startsAt",
        "endsAt",
        "anonymousRenderTestedAt",
        "lastTestedAt",
      ].includes(k) && typeof v === "number"
        ? Timestamp.fromMillis(v)
        : k === "discount" && v && typeof v === "object"
          ? encode(v as Record<string, unknown>)
          : v,
    ]),
  );
}
