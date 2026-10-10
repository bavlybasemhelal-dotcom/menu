import { test, expect } from "@playwright/test";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { emptyProduct, emptyOffer } from "../../src/features/products/models";

test("discounts and offers start and expire on an already-open page without a global recurring render", async ({
  browser,
}) => {
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  const db = getFirestore(
    initializeApp({ projectId: "demo-souqna" }, "schedule-test"),
  );
  const context = await browser.newContext();
  const product = await context.newPage(),
    offer = await context.newPage();
  const now = Date.now();
  const start = now + 600_000,
    end = now + 660_000,
    updatedAt = Timestamp.now();
  const pRef = db.doc("shops/main/products/scheduled-browser-only"),
    oRef = db.doc("shops/main/offers/scheduled-browser-only");
  await pRef.set({
    ...emptyProduct(),
    categoryId: "fresh",
    status: "published",
    unitPriceMinor: 10000,
    name: { ar: "منتج موعد الاختبار", en: "Scheduled test product" },
    searchTokens: [],
    discountEligible: true,
    discount: {
      kind: "percent",
      value: 25,
      target: "unit",
      startsAt: Timestamp.fromMillis(start),
      endsAt: Timestamp.fromMillis(end),
    },
    createdAt: updatedAt,
    updatedAt,
  });
  await oRef.set({
    ...emptyOffer(),
    status: "published",
    name: { ar: "عرض موعد الاختبار", en: "Scheduled test offer" },
    startsAt: Timestamp.fromMillis(start),
    endsAt: Timestamp.fromMillis(end),
    bundleProductIds: [],
    createdAt: updatedAt,
    updatedAt,
  });
  try {
    await product.clock.install({ time: new Date(now) });
    await offer.clock.install({ time: new Date(now) });
    await product.goto("/products/scheduled-browser-only");
    await offer.goto("/offers");
    const browse = offer.getByRole("button", {
      name: "تصفح الآن",
      exact: true,
    });
    if (await browse.isVisible()) await browse.click();
    await offer
      .getByRole("tab", { name: "العروض الخاصة", exact: true })
      .click();
    const price = product
      .locator(".detail-price [data-unit=unit] .price-value")
      .first();
    const card = offer
      .getByRole("link")
      .filter({ hasText: "عرض موعد الاختبار" });
    await expect(price).toContainText("١٠٠");
    await expect(offer.locator(".offer-grid")).toBeVisible();
    await expect(card).toHaveCount(0);
    for (const page of [product, offer])
      await page.clock.pauseAt(
        new Date(await page.evaluate(() => Date.now() + 1000)),
      );
    const advanceTo = async (page: typeof product, time: number) => {
      await page.bringToFront();
      await page.clock.runFor(time - (await page.evaluate(() => Date.now())));
    };
    // The scheduling hook deliberately suspends timers in background tabs.
    await advanceTo(product, start + 10);
    await expect(price).toContainText("٧٥");
    await advanceTo(offer, start + 10);
    await expect(card).toBeVisible();
    await advanceTo(product, end + 10);
    await expect(price).toContainText("١٠٠");
    await advanceTo(offer, end + 10);
    await expect(card).toHaveCount(0);
  } finally {
    await pRef.delete();
    await oRef.delete();
    await context.close();
  }
});
