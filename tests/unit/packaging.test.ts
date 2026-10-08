import { it, expect } from "vitest";
import {
  emptyProduct,
  productSchema,
} from "../../src/features/products/models";
import {
  productPrices,
  piecesPerCarton,
} from "../../src/features/products/logic";
const product = {
  ...emptyProduct(),
  name: { ar: "عبوات", en: "Packaging" },
  categoryId: "c",
  status: "published" as const,
  unitPriceMinor: 500,
  boxPriceMinor: 2500,
  cartonPriceMinor: 9000,
  boxQuantity: 6,
  cartonBoxQuantity: 4,
};
it("piece, box and carton are independent prices; carton holds boxes of pieces", () => {
  expect(productSchema.safeParse(product).success).toBe(true);
  expect(piecesPerCarton(product)).toBe(24);
  expect(productPrices(product)).toEqual({
    unit: 500,
    box: 2500,
    carton: 9000,
  });
});
it("supports one selling level without inventing other selling prices", () => {
  expect(
    productSchema.safeParse({
      ...product,
      unitPriceMinor: null,
      boxPriceMinor: null,
    }).success,
  ).toBe(true);
  expect(
    productPrices({ ...product, unitPriceMinor: null, boxPriceMinor: null }),
  ).toEqual({ unit: null, box: null, carton: 9000 });
  expect(
    productSchema.safeParse({
      ...product,
      unitPriceMinor: null,
      boxPriceMinor: null,
      cartonPriceMinor: null,
    }).success,
  ).toBe(false);
});
it("box discount applies only to boxes and all applies independently to each available level", () => {
  const discount = {
    kind: "percent" as const,
    value: 10,
    target: "box" as const,
    startsAt: null,
    endsAt: null,
  };
  expect(productPrices({ ...product, discount })).toEqual({
    unit: 500,
    box: 2250,
    carton: 9000,
  });
  expect(
    productPrices({ ...product, discount: { ...discount, target: "all" } }),
  ).toEqual({ unit: 450, box: 2250, carton: 8100 });
});
it("requires valid packing counts and prevents discount underflow in every selected selling level", () => {
  expect(
    productSchema.safeParse({ ...product, boxQuantity: null }).success,
  ).toBe(false);
  expect(
    productSchema.safeParse({ ...product, cartonBoxQuantity: 0 }).success,
  ).toBe(false);
  expect(
    productSchema.safeParse({
      ...product,
      discount: {
        kind: "fixed",
        value: 2501,
        target: "box",
        startsAt: null,
        endsAt: null,
      },
    }).success,
  ).toBe(false);
});
