import { test, expect } from "@playwright/test";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { createDemoCatalog } from "../../scripts/demo-catalog.mjs";
import { searchTokens } from "../../src/features/products/logic";

test("demo catalog remains editable with compact, responsive public and admin layouts", async ({
  browser,
  page,
}) => {
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  const db = getFirestore(
    initializeApp({ projectId: "demo-souqna" }, "density-test"),
  );
  const demo = createDemoCatalog(),
    time = Timestamp.now(),
    batch = db.batch();
  batch.set(db.doc("shops/main"), { ...demo.store, updatedAt: time });
  for (const [collection, records] of Object.entries({
    categories: demo.categories,
    products: demo.products,
    offers: demo.offers,
  }))
    for (const record of records)
      batch.set(db.doc(`shops/main/${collection}/${record.id}`), {
        ...record.data,
        createdAt: time,
        updatedAt: time,
        ...(collection === "products"
          ? {
              searchTokens: searchTokens(record.data.name),
              discountEligible: !!(
                "discount" in record.data && record.data.discount
              ),
            }
          : {}),
        ...(collection === "offers"
          ? {
              bundleProductIds:
                "bundleItems" in record.data
                  ? record.data.bundleItems.map((i) => i.productId)
                  : [],
            }
          : {}),
      });
  await batch.commit();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const splash = page.getByRole("button", { name: "تصفح الآن", exact: true });
  if (await splash.isVisible()) await splash.click();
  await expect
    .poll(() => page.locator(".product-card").count())
    .toBeGreaterThanOrEqual(24);
  await expect(page.locator(".pagination")).toHaveCount(0);
  await expect
    .poll(() =>
      page
        .locator(".product-grid")
        .evaluate(
          (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
        ),
    )
    .toBe(6);
  await expect
    .poll(() =>
      page
        .locator(".product-card")
        .first()
        .evaluate((el) => el.getBoundingClientRect().height),
    )
    .toBeLessThan(340);
  await page.screenshot({
    path: ".local/compact-demo-public-ar-1440.png",
    fullPage: true,
    animations: "disabled",
  });
  for (const width of [375, 768]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page
      .getByRole("button", { name: "تبديل المظهر", exact: true })
      .click();
    await page
      .getByRole("button", { name: "تبديل اللغة", exact: true })
      .click();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page.screenshot({
      path: `.local/compact-demo-public-en-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    await page
      .getByRole("button", { name: "Toggle language", exact: true })
      .click();
    await page
      .getByRole("button", { name: "تبديل المظهر", exact: true })
      .click();
  }
  await page.goto("/admin/login");
  await page
    .getByLabel("البريد الإلكتروني", { exact: true })
    .fill("owner@example.test");
  await page.getByLabel("كلمة المرور", { exact: true }).fill("LocalTest123!");
  await page
    .getByRole("button", { name: "دخول لوحة الإدارة", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/admin/products");
  await expect(page.locator("tbody tr").first()).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator("tbody tr")
        .first()
        .evaluate((el) => el.getBoundingClientRect().height),
    )
    .toBeLessThan(65);
  await page.screenshot({
    path: ".local/compact-demo-admin-ar-1440.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "التالي", exact: true }).click();
  await expect(page.locator(".pagination")).toContainText("صفحة 2");
  await expect(page.locator("tbody tr").first()).toBeVisible();
  await page.getByRole("button", { name: "البداية", exact: true }).click();
  await expect(page.locator(".pagination")).toContainText("صفحة 1");
  await page.getByLabel("بحث المنتجات", { exact: true }).fill("أرز");
  const row = page.locator("tbody tr").filter({ hasText: "أرز مصري" });
  await expect(row).toHaveCount(1);
  await row.getByRole("link", { name: "تعديل", exact: true }).click();
  const visitorContext = await browser.newContext();
  const visitor = await visitorContext.newPage();
  await visitor.goto("http://127.0.0.1:5173/products/demo-rice");
  await expect(
    visitor.locator('[data-unit="unit"] .price-value').first(),
  ).toContainText("٤٠٫٥");
  await page.getByLabel("سعر القطعة", { exact: true }).fill("49");
  await page.getByRole("button", { name: "حفظ المنتج", exact: true }).click();
  await expect(page.getByText("تم حفظ المنتج", { exact: false })).toBeVisible();
  await expect(
    visitor.locator('[data-unit="unit"] .price-value').first(),
  ).toContainText("٤٤٫١");
  await visitorContext.close();
});
