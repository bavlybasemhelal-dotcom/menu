import { test, expect, type Page } from "@playwright/test";
const arName = "متجر الاختبار الديناميكي",
  productName = "منتج اختبار ديناميكي",
  offerName = "عرض اختبار خاص";
async function login(page: Page) {
  await page.goto("/admin/login");
  await page
    .getByLabel("البريد الإلكتروني", { exact: true })
    .fill("owner@example.test");
  await page.getByLabel("كلمة المرور", { exact: true }).fill("LocalTest123!");
  await page
    .getByRole("button", { name: "دخول لوحة الإدارة", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin$/);
}
async function nameFields(page: Page, group: string, ar: string, en: string) {
  const fields = page.getByRole("group", { name: group, exact: true });
  await fields.getByLabel("العربية", { exact: true }).fill(ar);
  await fields.getByLabel("الإنجليزية", { exact: true }).fill(en);
}
test.describe.configure({ mode: "serial" });
test("box-only product, box discount, category edits and hide/delete persist for an unsigned visitor", async ({
  browser,
  page,
}) => {
  const context = await browser.newContext();
  const visitor = await context.newPage();
  const categoryName = "قسم عبوات الاختبار",
    name = "منتج علبة فقط";
  await login(page);
  await page.goto("/admin/categories");
  await page.getByRole("button", { name: "قسم جديد", exact: true }).click();
  await nameFields(page, "اسم القسم", categoryName, "Test packs");
  await page.getByRole("button", { name: "حفظ القسم", exact: true }).click();
  const categoryRow = page.getByRole("row").filter({ hasText: categoryName });
  await expect(categoryRow).toBeVisible();
  await categoryRow.getByRole("button", { name: "تعديل", exact: true }).click();
  await page.getByLabel("الترتيب", { exact: true }).fill("3");
  await page.getByRole("button", { name: "حفظ القسم", exact: true }).click();
  await expect(categoryRow.getByRole("cell").nth(1)).toHaveText("3");
  await page.goto("/admin/products/new");
  await nameFields(page, "اسم المنتج", name, "Box only product");
  await page
    .getByLabel("القسم", { exact: true })
    .selectOption({ label: categoryName + " · published" });
  await page.getByLabel("سعر العلبة (اختياري)", { exact: true }).fill("60");
  await page.getByLabel("عدد القطع داخل العلبة", { exact: true }).fill("6");
  await page.getByLabel("خصم إضافي", { exact: false }).check();
  await page.getByLabel("نوع الخصم", { exact: true }).selectOption("fixed");
  await page.getByLabel("قيمة الخصم", { exact: true }).fill("5");
  await page.getByLabel("تطبيق الخصم على", { exact: true }).selectOption("box");
  await page
    .getByLabel("حالة المنتج", { exact: true })
    .selectOption("published");
  await page.getByRole("button", { name: "حفظ المنتج", exact: true }).click();
  await expect(page.getByText("تم حفظ المنتج", { exact: true })).toBeVisible();
  await visitor.goto("/offers");
  const splash = visitor.getByRole("button", {
    name: "تصفح الآن",
    exact: true,
  });
  if (await splash.isVisible()) await splash.click();
  const card = visitor.getByRole("link", { name, exact: true });
  await expect(card).toBeVisible();
  await expect(card.locator("[data-unit=box] .price-value")).toContainText(
    "٥٥",
  );
  await expect(card.locator("[data-unit=unit],[data-unit=carton]")).toHaveCount(
    0,
  );
  await page.goto("/admin/products");
  await page.getByLabel("بحث المنتجات", { exact: true }).fill(name);
  await page
    .getByLabel("حالة النشر", { exact: true })
    .selectOption("published");
  await page.getByLabel("منتجات عليها خصم فقط", { exact: true }).check();
  const row = page.getByRole("row").filter({ hasText: name });
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "تغيير الظهور", exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.getByLabel("حالة النشر", { exact: true }).selectOption("hidden");
  await expect(row).toBeVisible();
  await row.getByRole("button", { name: "تغيير الظهور", exact: true }).click();
  await expect(card).toBeVisible();
  await page
    .getByLabel("حالة النشر", { exact: true })
    .selectOption("published");
  await row.getByRole("button", { name: "حذف", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "تأكيد", exact: true })
    .click();
  await expect(card).toHaveCount(0);
  await expect(row).toHaveCount(0);
  await page.goto("/admin/categories");
  await categoryRow.getByRole("button", { name: "حذف", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "تأكيد", exact: true })
    .click();
  await expect(categoryRow).toHaveCount(0);
  await context.close();
});
test("admin changes name/logo, creates product, edits price and publishes offer; unsigned visitor receives each change live", async ({
  browser,
  page,
}) => {
  const context = await browser.newContext();
  const visitor = await context.newPage();
  // Test-only synthetic image interception is not a live Google Drive test.
  await context.route(
    "https://drive.usercontent.google.com/download?export=view&id=test-logo**",
    (route) =>
      route.fulfill({
        contentType: "image/png",
        headers: { "Access-Control-Allow-Origin": "*" },
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5l8AAAAASUVORK5CYII=",
          "base64",
        ),
      }),
  );
  await visitor.goto("/");
  await visitor.getByRole("button", { name: "تصفح الآن", exact: true }).click();
  await login(page);
  await page.goto("/admin/settings");
  await nameFields(page, "اسم المحل", arName, "Dynamic test store");
  await page.getByRole("button", { name: /Browser test logo/ }).click();
  await page
    .getByRole("button", { name: "حفظ الإعدادات", exact: true })
    .click();
  await expect(
    page.getByText("تم حفظ إعدادات المحل", { exact: true }),
  ).toBeVisible();
  await expect(visitor.locator(".site-header .brand")).toContainText(arName);
  await expect(visitor.locator(".site-header .brand img")).toHaveAttribute(
    "src",
    /test-logo/,
  );
  await expect
    .poll(() =>
      visitor
        .locator(".site-header .brand img")
        .evaluate((e: HTMLImageElement) => e.complete && e.naturalWidth > 0),
    )
    .toBe(true);
  await page.goto("/admin/products/new");
  await nameFields(page, "اسم المنتج", productName, "Dynamic product");
  await page.getByLabel("القسم", { exact: true }).selectOption("fresh");
  await page.getByLabel("سعر القطعة", { exact: true }).fill("125.50");
  await page.getByLabel("سعر العلبة (اختياري)", { exact: true }).fill("500");
  await page.getByLabel("سعر الكرتونة (اختياري)", { exact: true }).fill("1900");
  await page.getByLabel("عدد القطع داخل العلبة", { exact: true }).fill("6");
  await page.getByLabel("عدد العلب داخل الكرتونة", { exact: true }).fill("4");
  await page
    .getByLabel("حالة المنتج", { exact: true })
    .selectOption("published");
  await page.getByRole("button", { name: "حفظ المنتج", exact: true }).click();
  await expect(page.getByText("تم حفظ المنتج", { exact: true })).toBeVisible();
  const productUrl = page.url();
  const card = visitor.getByRole("link", { name: productName, exact: true });
  await expect(card).toBeVisible();
  await expect(card.locator(".price-value").first()).toContainText("١٢٥");
  // Compact cards retain prices; the full packaging hierarchy lives in details.
  const packaging = await context.newPage();
  await packaging.goto((await card.getAttribute("href"))!);
  await expect(packaging.locator("[data-unit=box]").first()).toContainText("٦");
  await expect(packaging.locator("[data-unit=carton]").first()).toContainText(
    "٢٤",
  );
  await packaging.close();
  await page.getByLabel("سعر القطعة", { exact: true }).fill("130.25");
  await page.getByRole("button", { name: "حفظ المنتج", exact: true }).click();
  await expect(card.locator(".price-value").first()).toContainText("١٣٠");
  await visitor.goto("/offers");
  await visitor
    .getByRole("tab", { name: "العروض الخاصة", exact: true })
    .click();
  await page.goto("/admin/offers/new");
  await nameFields(page, "اسم العرض", offerName, "Dynamic special");
  await page
    .getByLabel("حالة النشر", { exact: true })
    .selectOption("published");
  await page.getByRole("button", { name: "حفظ العرض", exact: true }).click();
  await expect(page.getByText("تم حفظ العرض", { exact: true })).toBeVisible();
  await expect(
    visitor.getByRole("link").filter({ hasText: offerName }),
  ).toBeVisible();
  await page.goto("/admin/offers/new");
  await page.getByLabel("نوع العرض", { exact: true }).selectOption("bundle");
  await nameFields(page, "اسم العرض", "باقة اختبار", "Test bundle");
  await page
    .getByRole("button", { name: productName + " · published", exact: true })
    .click();
  await page.getByLabel("الوحدة", { exact: true }).selectOption("box");
  await page.getByLabel("السعر النهائي للباقة", { exact: true }).fill("200");
  await page
    .getByLabel("حالة النشر", { exact: true })
    .selectOption("published");
  await page.getByRole("button", { name: "حفظ العرض", exact: true }).click();
  await expect(page.getByText("تم حفظ العرض", { exact: true })).toBeVisible();
  const bundleUrl = page.url();
  await visitor.getByRole("tab", { name: "الباقات", exact: true }).click();
  await expect(
    visitor.getByRole("link").filter({ hasText: "باقة اختبار" }),
  ).toBeVisible();
  await page.goto(productUrl);
  await page.getByLabel("سعر القطعة", { exact: true }).fill("140");
  await page.getByRole("button", { name: "حفظ المنتج", exact: true }).click();
  await expect(
    visitor.getByRole("link").filter({ hasText: "باقة اختبار" }),
  ).toHaveCount(0);
  await page.goto(bundleUrl);
  await expect(
    page.getByText("تغيّر منتج مرتبط بهذه الباقة.", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("راجعت تفاصيل الباقة", { exact: true }).check();
  await page
    .getByLabel("حالة النشر", { exact: true })
    .selectOption("published");
  await page.getByRole("button", { name: "حفظ العرض", exact: true }).click();
  await expect(
    visitor.getByRole("link").filter({ hasText: "باقة اختبار" }),
  ).toBeVisible();
  await context.close();
});
test("anonymous guard, language/theme persistence, responsive pages and no purchase controls", async ({
  page,
}) => {
  await page.goto("/admin/settings");
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/");
  const splash = page.getByRole("button", { name: "تصفح الآن", exact: true });
  if (await splash.isVisible()) await splash.click();
  await page.getByRole("button", { name: "تبديل المظهر", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "تبديل اللغة", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await page.goto("/offers");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/",
      "/offers",
      "/products/preview-1",
      "/offers/preview-offer",
      "/admin/login",
    ]) {
      await page.goto(route);
      await expect(page.locator("h1,h2").first()).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      await expect(
        page.getByRole("button", { name: /Toggle theme/ }),
      ).toBeVisible();
      await expect(
        page.getByText(
          /Add to cart|Checkout|Buy now|دفع|سلة مشتريات|إضافة للسلة/i,
        ),
      ).toHaveCount(0);
      if (route === "/" && [375, 1440].includes(width))
        await page.screenshot({
          path: `.local/visitor-dark-en-${width}.png`,
          fullPage: true,
          animations: "disabled",
        });
      await page
        .getByRole("button", { name: "Toggle language", exact: true })
        .click();
      await page
        .getByRole("button", { name: "تبديل المظهر", exact: true })
        .click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
      await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      if (route === "/" && [375, 1440].includes(width))
        await page.screenshot({
          path: `.local/visitor-light-ar-${width}.png`,
          fullPage: true,
          animations: "disabled",
        });
      await page
        .getByRole("button", { name: "تبديل المظهر", exact: true })
        .click();
      await page
        .getByRole("button", { name: "تبديل اللغة", exact: true })
        .click();
    }
  }
});
test("all admin routes support light/dark and Arabic/English at mobile and desktop widths", async ({
  page,
}) => {
  await login(page);
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of [
      "/admin",
      "/admin/settings",
      "/admin/products",
      "/admin/products/new",
      "/admin/categories",
      "/admin/offers",
      "/admin/offers/new",
      "/admin/banners",
      "/admin/media",
      "/admin/drive",
    ]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      await page
        .getByRole("button", { name: "تبديل المظهر", exact: true })
        .click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await page
        .getByRole("button", { name: "تبديل اللغة", exact: true })
        .click();
      await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      if (
        [375, 1440].includes(width) &&
        ["/admin", "/admin/products/new", "/admin/drive"].includes(route)
      )
        await page.screenshot({
          path: `.local/${route.slice(1).replaceAll("/", "-")}-dark-en-${width}.png`,
          fullPage: true,
          animations: "disabled",
        });
      await page
        .getByRole("button", { name: "Toggle language", exact: true })
        .click();
      await page
        .getByRole("button", { name: "تبديل المظهر", exact: true })
        .click();
      await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    }
  }
  await page.screenshot({
    path: ".local/drive-guide-light-ar.png",
    fullPage: true,
    animations: "disabled",
  });
});
