import { expect, it } from "vitest";
import { createDemoCatalog } from "../../scripts/demo-catalog.mjs";
import {
  storeSchema,
  categorySchema,
  productSchema,
  offerSchema,
} from "../../src/features/products/models";
import { productPrices } from "../../src/features/products/logic";

it("presentation fixtures are bilingual, valid and use real editable catalog contracts", () => {
  const demo = createDemoCatalog();
  expect(storeSchema.parse(demo.store).description.ar).toContain("تجريبية");
  expect(demo.categories).toHaveLength(6);
  expect(demo.products).toHaveLength(24);
  for (const records of [demo.categories, demo.products, demo.offers])
    expect(new Set(records.map((d) => d.id)).size).toBe(records.length);
  const categories = new Set(demo.categories.map((d) => d.id));
  for (const { data } of demo.categories) categorySchema.parse(data);
  for (const { data } of demo.products) {
    const product = productSchema.parse(data);
    expect(categories.has(product.categoryId)).toBe(true);
    expect(product.name.ar && product.name.en).toBeTruthy();
    expect(product.imageMediaIds).toEqual([]);
    for (const price of Object.values(productPrices(product)))
      if (price !== null)
        expect(Number.isSafeInteger(price) && price >= 0).toBe(true);
  }
  const products = new Map(demo.products.map((d) => [d.id, d.data]));
  for (const { data } of demo.offers) {
    const offer = offerSchema.parse(data);
    expect(offer.imageMediaId).toBeNull();
    for (const item of offer.bundleItems) {
      const product = products.get(item.productId)!;
      expect(product.status).toBe("published");
      expect(
        product[
          item.unit === "unit"
            ? "unitPriceMinor"
            : item.unit === "box"
              ? "boxPriceMinor"
              : "cartonPriceMinor"
        ],
      ).not.toBeNull();
    }
  }
});
