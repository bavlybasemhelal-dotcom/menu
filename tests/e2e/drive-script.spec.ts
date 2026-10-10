import { test, expect, type Page, type Route } from "@playwright/test";
async function names(page: Page, group: string, ar: string, en: string) {
  const field = page.getByRole("group", { name: group, exact: true });
  await field.getByLabel("العربية", { exact: true }).fill(ar);
  await field.getByLabel("الإنجليزية", { exact: true }).fill(en);
}
test("mocked Drive protocol: inline images in every editor, private originals, failure recovery and live anonymous viewing", async ({
  page,
  browser,
}) => {
  // Network fixtures exercise UI/protocol behavior, not real Google acceptance.
  const script = "https://script.google.com/macros/s/local-test-only/exec";
  const image = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAE0lEQVR4nGMUbbBlgAEmOAsvBwAp4ADa7X4xOwAAAABJRU5ErkJggg==",
    "base64",
  );
  const files = new Map<
    string,
    {
      fileId: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      folderName: string;
      folderId: string;
      base64: string;
      shared: boolean;
    }
  >();
  const payloads: Record<string, unknown>[] = [];
  const reads = new Map<string, number>();
  let brokenImage = false,
    badAuth = false;
  const handler = async (route: Route) => {
    let data: unknown;
    if (route.request().method() === "GET") {
      expect(route.request().headers().authorization).toBeUndefined();
      const requestedId =
        new URL(route.request().url()).searchParams.get("fileId") || "";
      reads.set(requestedId, (reads.get(requestedId) || 0) + 1);
      const file = files.get(
        new URL(route.request().url()).searchParams.get("fileId") || "",
      );
      data =
        file?.shared && !file.folderName.includes("Private Originals")
          ? {
              success: true,
              version: 2,
              fileId: file.fileId,
              mimeType: file.mimeType,
              fileSize: brokenImage ? 3 : file.fileSize,
              base64: brokenImage ? "YWJj" : file.base64,
            }
          : { success: false, error: "PUBLIC_IMAGE_UNAVAILABLE" };
    } else {
      const body = route.request().postDataJSON();
      payloads.push(body);
      expect(typeof body.idToken).toBe("string");
      if (badAuth) data = { success: false, error: "AUTH_CHECK_FAILED" };
      else if (body.action === "ping")
        data = {
          success: true,
          version: 2,
          rootFolderId: "script-root",
          rootFolderName: "Test catalog files",
          storageUsed: 12345,
        };
      else if (body.action === "upload") {
        const id = "inline-file-" + files.size;
        const folderName =
          body.category === "originals"
            ? "Private Originals"
            : body.category === "branding"
              ? "Branding"
              : body.category === "offers"
                ? "Offers & Banners"
                : "Products";
        const file = {
          fileId: id,
          fileName: body.fileName,
          fileSize: Buffer.from(body.fileData, "base64").length,
          mimeType: body.mimeType,
          folderName,
          folderId: body.category + "-folder",
          base64: body.fileData,
          shared: false,
        };
        files.set(id, file);
        data = { success: true, ...file, base64: undefined, shared: undefined };
      } else if (body.action === "share") {
        const file = files.get(body.fileId)!;
        expect(file.folderName).not.toContain("Private Originals");
        file.shared = true;
        data = { success: true };
      } else if (body.action === "list")
        data = { success: true, files: [...files.values()], truncated: false };
      else data = { success: true };
    }
    await route.fulfill({
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify(data),
    });
  };
  await page.route(script + "**", handler);
  await page.goto("/admin/login");
  await page
    .getByLabel("البريد الإلكتروني", { exact: true })
    .fill("owner@example.test");
  await page.getByLabel("كلمة المرور", { exact: true }).fill("LocalTest123!");
  await page
    .getByRole("button", { name: "دخول لوحة الإدارة", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.locator('a[href="/admin/media"]')).toHaveCount(0);
  await page.goto("/admin/media");
  await expect(page).toHaveURL(/\/admin\/products$/);
  await page.goto("/admin/drive");
  await expect(page.locator("body")).not.toContainText(
    /Nexara|Nexera|Drive API المباشر/i,
  );
  await page
    .getByLabel("البريد الإلكتروني لحساب Google (Gmail)", { exact: true })
    .fill("drive@example.test");
  await page
    .getByLabel("رابط تطبيق الويب (Web App URL)", { exact: true })
    .fill(script);
  await page.getByLabel("الصور — MB", { exact: true }).fill("5");
  await page
    .getByRole("button", { name: "اختبار وحفظ الربط", exact: true })
    .click();
  await expect(
    page.getByText("تم الاتصال وحفظ الربط والمجلد؛ اختبار الصورة منفصل", {
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByLabel("رابط تطبيق الويب (Web App URL)", { exact: true }),
  ).toHaveValue(script);
  await page.getByRole("button", { name: "عرض الكود", exact: true }).click();
  const code = await page
    .getByLabel("كود Google Apps Script", { exact: true })
    .inputValue();
  expect(code).toContain('"adminUid":"emulator-admin"');
  expect(code).toContain("accounts:lookup");
  expect(code).not.toContain("LocalTest123!");
  const context = await browser.newContext(),
    visitor = await context.newPage();
  await visitor.route(script + "**", handler);
  await visitor.goto("/");
  await visitor.getByRole("button", { name: "تصفح الآن", exact: true }).click();
  async function upload(label: string, name: string) {
    await page
      .getByLabel(label, { exact: true })
      .setInputFiles({ name, mimeType: "image/png", buffer: image });
    await expect(
      page.getByText("الصورة جاهزة؛ احفظ البيانات لإظهارها في الكتالوج", {
        exact: true,
      }),
    ).toBeVisible();
    await page.locator(".inline-image-card").first().scrollIntoViewIfNeeded();
    await expect(page.locator(".inline-image-card img").first()).toBeVisible();
  }
  await page.goto("/admin/settings");
  await upload("رفع شعار المحل", "inline-logo.png");
  expect(payloads.filter((p) => p.action === "upload")).toHaveLength(1);
  expect(
    [...files.values()].some((f) => f.folderName === "Private Originals"),
  ).toBe(false);
  await page
    .getByRole("button", { name: "حفظ الإعدادات", exact: true })
    .click();
  await expect(
    page.getByText("تم حفظ إعدادات المحل", { exact: true }),
  ).toBeVisible();
  await expect(visitor.locator(".site-header .brand img")).toBeVisible();
  await expect
    .poll(() =>
      visitor
        .locator(".site-header .brand img")
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBe(4);
  // Replacing a logo must update an open anonymous page; GIF bytes retain their format.
  const gif = Buffer.from(
    "R0lGODlhAQABAIAAAAUEBAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
    "base64",
  );
  await page
    .getByRole("checkbox", {
      name: "احتفظ بنسخة أصلية خاصة أيضًا (رفع إضافي)",
      exact: true,
    })
    .check();
  await page.getByLabel("رفع شعار المحل", { exact: true }).setInputFiles({
    name: "replacement.gif",
    mimeType: "image/gif",
    buffer: gif,
  });
  await expect(
    page
      .locator(".inline-image-card")
      .getByText("replacement.gif", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "حفظ الإعدادات", exact: true }),
  ).toBeEnabled();
  const replacementId = await page
    .locator(".inline-image-card .media-image")
    .getAttribute("data-media-id");
  // Assert the new record is attached before checking its decoded image size.
  await expect(
    page.getByText("الصورة جاهزة؛ احفظ البيانات لإظهارها في الكتالوج", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "حفظ الإعدادات", exact: true })
    .click();
  await expect(
    visitor.locator(".site-header .brand .media-image"),
  ).toHaveAttribute("data-media-id", replacementId!);
  await expect
    .poll(() =>
      visitor
        .locator(".site-header .brand img")
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBe(1);
  expect(
    [...files.values()].filter((f) => f.fileName === "replacement.gif"),
  ).toHaveLength(2);
  await page.goto("/admin/categories");
  await page.getByRole("button", { name: "قسم جديد", exact: true }).click();
  await expect(
    page.getByRole("group", { name: "اسم القسم", exact: true }),
  ).toBeVisible();
  await names(page, "اسم القسم", "قسم صور مباشرة", "Inline image category");
  await upload("رفع صورة القسم", "inline-category.png");
  await page.getByRole("button", { name: "حفظ القسم", exact: true }).click();
  await expect(page.getByText("تم حفظ القسم", { exact: true })).toBeVisible();
  await page.goto("/admin/products/new");
  await names(page, "اسم المنتج", "منتج صورة مباشرة", "Inline image product");
  await page
    .getByLabel("القسم", { exact: true })
    .selectOption({ label: "قسم صور مباشرة · published" });
  await page.getByLabel("سعر القطعة", { exact: true }).fill("75");
  await page
    .getByLabel("حالة المنتج", { exact: true })
    .selectOption("published");
  brokenImage = true;
  await page
    .getByRole("checkbox", {
      name: "احتفظ بنسخة أصلية خاصة أيضًا (رفع إضافي)",
      exact: true,
    })
    .check();
  await page.getByLabel("رفع صور المنتج", { exact: true }).setInputFiles({
    name: "inline-product.png",
    mimeType: "image/png",
    buffer: image,
  });
  await expect(page.getByRole("alert")).toContainText("تعذر قراءة الصورة");
  await expect(
    page.locator('.inline-image-card img[alt="معاينة الصورة المختارة"]'),
  ).toBeVisible();
  const uploadCount = payloads.filter((p) => p.action === "upload").length;
  brokenImage = false;
  await page
    .getByRole("button", {
      name: "إكمال حفظ واختبار الصورة بدون إعادة رفع",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("الصورة جاهزة؛ احفظ البيانات", { exact: true }),
  ).toBeVisible();
  expect(payloads.filter((p) => p.action === "upload")).toHaveLength(
    uploadCount,
  );
  await page.getByRole("button", { name: "حفظ المنتج", exact: true }).click();
  await expect(page.getByText("تم حفظ المنتج", { exact: true })).toBeVisible();
  const card = visitor.getByRole("link", {
    name: "منتج صورة مباشرة",
    exact: true,
  });
  await expect(card).toBeVisible();
  const productMediaId = await page
    .locator(".inline-image-card .media-image")
    .getAttribute("data-media-id");
  const mediaEndpoint =
    "http://127.0.0.1:8080/v1/projects/demo-souqna/databases/(default)/documents/shops/main/media/" +
    productMediaId;
  const originalId = (await (await fetch(mediaEndpoint)).json()).fields
    .originalMediaId.stringValue;
  await expect(card.locator("img")).toBeVisible();
  await expect
    .poll(() =>
      card.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBe(4);
  const productFileId = await card
    .locator(".media-image")
    .getAttribute("data-file-id");
  expect(productFileId).toBeTruthy();
  const readsBeforePriceEdit = reads.get(productFileId!);
  expect(readsBeforePriceEdit).toBeGreaterThan(0);
  await page.getByLabel("سعر القطعة", { exact: true }).fill("79");
  await page.getByRole("button", { name: "حفظ المنتج", exact: true }).click();
  await expect(card.locator(".price-value").first()).toContainText("٧٩");
  await expect
    .poll(() =>
      card.locator("img").evaluate((img: HTMLImageElement) => img.naturalWidth),
    )
    .toBe(4);
  expect(reads.get(productFileId!)).toBe(readsBeforePriceEdit);
  for (const banner of [false, true]) {
    await page.goto("/admin/offers/new" + (banner ? "?banner=1" : ""));
    await names(
      page,
      "اسم العرض",
      banner ? "بنر صورة مباشرة" : "عرض صورة مباشرة",
      banner ? "Inline banner" : "Inline offer",
    );
    await page
      .getByLabel("حالة النشر", { exact: true })
      .selectOption("published");
    await upload(
      "رفع صورة العرض أو البنر",
      banner ? "inline-banner.png" : "inline-offer.png",
    );
    await page.getByRole("button", { name: "حفظ العرض", exact: true }).click();
    await expect(page.getByText("تم حفظ العرض", { exact: true })).toBeVisible();
  }
  await visitor.goto("/offers");
  await visitor
    .getByRole("tab", { name: "العروض الخاصة", exact: true })
    .click();
  await expect(
    visitor
      .getByRole("link")
      .filter({ hasText: "عرض صورة مباشرة" })
      .locator("img"),
  ).toBeVisible();
  expect(
    [...files.values()]
      .filter((f) => f.folderName.includes("Private Originals"))
      .every((f) => !f.shared),
  ).toBe(true);
  await page.goto("/admin/products/new");
  await page
    .getByText("الصور السابقة واستعادة رفع غير مكتمل", { exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "استعادة صور من مجلد هذا القسم في Drive",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", { name: "استعادة واستخدام الصورة", exact: true }),
  ).toHaveCount(1);
  await page
    .getByRole("button", { name: "استعادة واستخدام الصورة", exact: true })
    .click();
  await expect(
    page.getByText("تمت استعادة الصورة؛ احفظ البيانات", { exact: true }),
  ).toBeVisible();
  expect(
    (await (await fetch(mediaEndpoint)).json()).fields.originalMediaId
      .stringValue,
  ).toBe(originalId);
  for (const [width, en, dark] of [
    [375, false, false],
    [1440, true, true],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    if (en)
      await page
        .getByRole("button", { name: "تبديل اللغة", exact: true })
        .click();
    if (dark)
      await page
        .getByRole("button", { name: "Toggle theme", exact: true })
        .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `.local/inline-images-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
  await page
    .getByRole("button", { name: "Toggle language", exact: true })
    .click();
  badAuth = true;
  await page.goto("/admin/drive");
  await page
    .getByRole("button", { name: "اختبار وحفظ الربط", exact: true })
    .click();
  await expect(page.getByText(/تعذر التحقق من حساب الأدمن/)).toBeVisible();
  await context.close();
});
