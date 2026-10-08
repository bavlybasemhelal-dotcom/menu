import type { Discount, Localized, ProductData } from "./models";
export function localize(value: Localized | undefined, locale: "ar" | "en") {
  return (
    value?.[locale]?.trim() ||
    value?.[locale === "ar" ? "en" : "ar"]?.trim() ||
    ""
  );
}
export function inSchedule(
  value: { startsAt?: number | null; endsAt?: number | null },
  now = Date.now(),
) {
  return (
    (value.startsAt == null || now >= value.startsAt) &&
    (value.endsAt == null || now <= value.endsAt)
  );
}
export function priceAfterDiscount(price: number, d: Discount) {
  if (!Number.isSafeInteger(price) || price < 0) throw Error("Invalid price");
  if (
    !Number.isFinite(d.value) ||
    d.value < 0 ||
    (d.kind === "percent" && d.value > 100) ||
    (d.kind === "fixed" && !Number.isSafeInteger(d.value))
  )
    throw Error("Invalid discount");
  const amount =
    d.kind === "percent" ? Math.round((price * d.value) / 100) : d.value;
  if (amount > price) throw Error("Discount exceeds price");
  return price - amount;
}
export function productPrices(p: ProductData, now = Date.now()) {
  const d =
    p.status === "published" && p.discount && inSchedule(p.discount, now)
      ? p.discount
      : null;
  return {
    unit:
      p.unitPriceMinor === null
        ? null
        : d && discountApplies(d, "unit")
          ? priceAfterDiscount(p.unitPriceMinor, d)
          : p.unitPriceMinor,
    box:
      p.boxPriceMinor == null
        ? null
        : d && discountApplies(d, "box")
          ? priceAfterDiscount(p.boxPriceMinor, d)
          : p.boxPriceMinor,
    carton:
      p.cartonPriceMinor === null
        ? null
        : d && discountApplies(d, "carton")
          ? priceAfterDiscount(p.cartonPriceMinor, d)
          : p.cartonPriceMinor,
  };
}
export function discountApplies(d: Discount, unit: "unit" | "box" | "carton") {
  return (
    d.target === unit ||
    d.target === "all" ||
    (d.target === "both" && unit !== "box")
  );
}
export function piecesPerCarton(p: ProductData) {
  return p.boxQuantity && p.cartonBoxQuantity
    ? p.boxQuantity * p.cartonBoxQuantity
    : p.cartonQuantity;
}
export function hasActiveDiscount(p: ProductData, now = Date.now()) {
  if (
    !p.discount ||
    p.discount.value === 0 ||
    p.status !== "published" ||
    !inSchedule(p.discount, now)
  )
    return false;
  let v;
  try {
    v = productPrices(p, now);
  } catch {
    return false;
  }
  return (
    (v.unit !== null &&
      p.unitPriceMinor !== null &&
      v.unit < p.unitPriceMinor) ||
    (v.box !== null && p.boxPriceMinor !== null && v.box < p.boxPriceMinor) ||
    (v.carton !== null &&
      p.cartonPriceMinor !== null &&
      v.carton < p.cartonPriceMinor)
  );
}
export function normalizeSearch(s: string) {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/\s+/g, " ")
    .trim();
}
export function searchTokens(name: Localized) {
  const tokens = new Set<string>();
  for (const text of [name.ar, name.en]) {
    const normalized = normalizeSearch(text);
    for (const term of [normalized, ...normalized.split(" ")])
      for (let n = 1; n <= Math.min(term.length, 30); n++)
        tokens.add(term.slice(0, n));
  }
  return [...tokens].slice(0, 180);
}
export function money(value: number, currency: string, locale: "ar" | "en") {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-GB", {
    style: "currency",
    currency,
  }).format(value / 100);
}
export const formatMoney = money;
export function minorUnits(value: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value))
    throw Error("Use up to two decimals / استخدم منزلتين عشريتين");
  const [a, b = ""] = value.split(".");
  const result = Number(a) * 100 + Number(b.padEnd(2, "0"));
  if (!Number.isSafeInteger(result) || result > 1_000_000_000)
    throw Error("Invalid amount");
  return result;
}
