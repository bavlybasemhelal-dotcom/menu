import { describe, it, expect } from "vitest";
import {
  emptyProduct,
  productSchema,
  type Discount,
} from "../../src/features/products/models";
import {
  productPrices,
  hasActiveDiscount,
  priceAfterDiscount,
  localize,
  minorUnits,
  searchTokens,
} from "../../src/features/products/logic";
import {
  safeFacebook,
  whatsappLink,
  isDriveAssetUrl,
} from "../../src/utils/urls";
const discount = (target: Discount["target"] = "unit"): Discount => ({
  kind: "percent",
  value: 25,
  target,
  startsAt: 1000,
  endsAt: 2000,
});
describe("prices and schedules", () => {
  it("unit and carton targets are independent; absence stays null", () => {
    const p = {
      ...emptyProduct(),
      status: "published" as const,
      unitPriceMinor: 10100,
      cartonPriceMinor: 60000,
      discount: discount(),
    };
    expect(productPrices(p, 1500)).toEqual({
      unit: 7575,
      box: null,
      carton: 60000,
    });
    p.discount.target = "carton";
    expect(productPrices(p, 1500)).toEqual({
      unit: 10100,
      box: null,
      carton: 45000,
    });
    expect(
      productPrices({ ...p, cartonPriceMinor: null }, 1500).carton,
    ).toBeNull();
  });
  it("includes start/end boundaries and expires automatically", () => {
    const p = {
      ...emptyProduct(),
      status: "published" as const,
      unitPriceMinor: 100,
      discount: discount(),
    };
    expect(hasActiveDiscount(p, 999)).toBe(false);
    expect(hasActiveDiscount(p, 1000)).toBe(true);
    expect(hasActiveDiscount(p, 2000)).toBe(true);
    expect(hasActiveDiscount(p, 2001)).toBe(false);
    expect(hasActiveDiscount({ ...p, status: "hidden" }, 1500)).toBe(false);
  });
  it("integer rounding, zero/full percent, and invalid fixed values", () => {
    expect(priceAfterDiscount(101, { ...discount(), value: 50 })).toBe(50);
    expect(priceAfterDiscount(101, { ...discount(), value: 0 })).toBe(101);
    expect(priceAfterDiscount(101, { ...discount(), value: 100 })).toBe(0);
    expect(() =>
      priceAfterDiscount(101, { ...discount(), kind: "fixed", value: 102 }),
    ).toThrow();
    expect(() =>
      priceAfterDiscount(101, { ...discount(), value: 101 }),
    ).toThrow();
  });
  it("rejects invalid model, reversed schedule and variant discount underflow", () => {
    const p = {
      ...emptyProduct(),
      name: { ar: "اختبار", en: "Test" },
      categoryId: "c",
      unitPriceMinor: 100,
    };
    expect(productSchema.safeParse(p).success).toBe(true);
    expect(
      productSchema.safeParse({ ...p, discount: { ...discount(), endsAt: 0 } })
        .success,
    ).toBe(false);
    expect(
      productSchema.safeParse({
        ...p,
        discount: { ...discount(), kind: "fixed", value: 101 },
      }).success,
    ).toBe(false);
  });
  it("parses decimal input without floating point errors", () => {
    expect(minorUnits("1.01")).toBe(101);
    expect(minorUnits("0.1")).toBe(10);
    expect(() => minorUnits("1.001")).toThrow();
  });
});
describe("localized content, search and outbound links", () => {
  it("fallback preserves mutable content", () =>
    expect(localize({ ar: "اسم جديد", en: "" }, "en")).toBe("اسم جديد"));
  it("indexes Arabic diacritics and English word prefixes", () => {
    const values = searchTokens({ ar: "أَرُز مصري", en: "Egyptian Rice" });
    expect(values).toContain("ارز");
    expect(values).toContain("rice");
  });
  it("rejects spoofed/insecure external destinations", () => {
    expect(safeFacebook("javascript:alert(1)")).toBeNull();
    expect(safeFacebook("https://facebook.com.evil.test/x")).toBeNull();
    expect(whatsappLink("bad")).toBeNull();
    expect(
      whatsappLink("201001234567", "اسم &", "https://example.test", "ar"),
    ).toContain("%26");
  });
  it("never accepts a Drive sharing page or tokenized media URL as public asset", () => {
    expect(isDriveAssetUrl("https://drive.google.com/file/d/abc/view")).toBe(
      false,
    );
    expect(
      isDriveAssetUrl(
        "https://www.googleapis.com/drive/v3/files/abc?alt=media&access_token=secret",
      ),
    ).toBe(false);
  });
});
