import { test, expect } from "@playwright/test";
test("single Apps Script setup persists in Firestore and its mocked upload/share/image gate updates an unsigned visitor", async ({
  page,
  browser,
}) => {
  // Network fixtures exercise our browser protocol/UI. They are NOT real Google Drive acceptance.
  const scriptUrl = "https://script.google.com/macros/s/local-test-only/exec";
  const imageUrl =
    "https://drive.usercontent.google.com/download?export=view&id=local-script-file";
  const image = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAE0lEQVR4nGMUbbBlgAEmOAsvBwAp4ADa7X4xOwAAAABJRU5ErkJggg==",
    "base64",
  );
  const payloads: Record<string, unknown>[] = [];
  const metadata = {
    fileId: "local-script-file",
    fileName: "bridge-test.png",
    fileSize: image.length,
    mimeType: "image/png",
    folderId: "branding-folder",
    folderName: "Branding",
    directUrl: imageUrl,
  };
  let fail = false;
  await page.route(scriptUrl, async (route) => {
    const body = route.request().postDataJSON();
    payloads.push(body);
    expect(typeof body.idToken).toBe("string");
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(
        fail
          ? { success: false, error: "AUTH_CHECK_FAILED" }
          : body.action === "ping"
            ? {
                success: true,
                version: 1,
                rootFolderId: "script-root",
                rootFolderName: "Test catalog files",
                storageUsed: 12345,
              }
            : body.action === "list"
              ? { success: true, files: [metadata], truncated: false }
              : { success: true, ...metadata },
      ),
    });
  });
  await page.route(imageUrl, (route) =>
    route.fulfill({
      contentType: "image/png",
      body: image,
      headers: { "Access-Control-Allow-Origin": "*" },
    }),
  );
  await page.goto("/admin/login");
  await page
    .getByLabel("البريد الإلكتروني", { exact: true })
    .fill("owner@example.test");
  await page.getByLabel("كلمة المرور", { exact: true }).fill("LocalTest123!");
  await page
    .getByRole("button", { name: "دخول لوحة الإدارة", exact: true })
    .click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto("/admin/drive");
  await expect(
    page.getByLabel("اختر طريقة تخزين الوسائط", { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText(
    /Nexara|Nexera|Drive API المباشر/i,
  );
  await page
    .getByLabel("البريد الإلكتروني لحساب Google (Gmail)", { exact: true })
    .fill("drive@example.test");
  await page
    .getByLabel("رابط تطبيق الويب (Web App URL)", { exact: true })
    .fill(scriptUrl);
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
  ).toHaveValue(scriptUrl);
  await expect(page.getByText(/آخر اختبار اتصال نجح/)).toBeVisible();
  await page.getByRole("button", { name: "عرض الكود", exact: true }).click();
  const code = await page
    .getByLabel("كود Google Apps Script", { exact: true })
    .inputValue();
  expect(code).toContain('"adminUid":"emulator-admin"');
  expect(code).toContain("accounts:lookup");
  expect(code).not.toContain("LocalTest123!");
  expect(code).not.toContain("/*__PUBLIC_CONFIG__*/ null");
  expect(code).not.toMatch(/Nexara|Nexera/i);
  for (const [width, lang, theme] of [
    [375, "ar", "light"],
    [1440, "en", "dark"],
  ] as const) {
    await page.setViewportSize({ width, height: 900 });
    if (lang === "en")
      await page
        .getByRole("button", { name: "تبديل اللغة", exact: true })
        .click();
    if (theme === "dark")
      await page
        .getByRole("button", { name: "Toggle theme", exact: true })
        .click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: `.local/drive-script-${theme}-${lang}-${width}.png`,
      animations: "disabled",
    });
  }
  // Restore Arabic to exercise the actual bilingual form labels.
  await page
    .getByRole("button", { name: "Toggle language", exact: true })
    .click();
  await page.goto("/admin/media");
  await page
    .getByLabel("مجلد تنظيم الملف", { exact: true })
    .selectOption("branding");
  await page.getByLabel(/حفظ الأصل الخاص/).uncheck();
  await page
    .getByLabel("اختر صورة أو فيديو أو ملف", { exact: true })
    .setInputFiles({
      name: "bridge-test.png",
      mimeType: "image/png",
      buffer: image,
    });
  const card = page
    .locator(".media-card")
    .filter({ hasText: "bridge-test.png" });
  await expect(card).toBeVisible();
  await page
    .getByRole("button", { name: "فحص مجلد التطبيق", exact: true })
    .click();
  await page
    .getByRole("button", { name: "استعادة البيانات", exact: true })
    .click();
  await expect(
    page.getByText("تم العثور على السجل أو استعادة بيانات الملف غير المنشور", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(card).toHaveCount(1);
  expect(payloads.find((body) => body.action === "upload")).toMatchObject({
    category: "branding",
    fileData: image.toString("base64"),
  });
  await card
    .getByRole("button", { name: "مشاركة هذا الملف", exact: true })
    .click();
  await expect(
    card.getByText("مشارك — غير متحقق", { exact: true }),
  ).toBeVisible();
  await expect(
    card.getByRole("button", { name: "اختبار وحفظ نتيجة الصورة", exact: true }),
  ).toBeDisabled();
  await card
    .getByLabel("رأيت الصورة في نافذة متخفية بدون دخول", { exact: true })
    .check();
  await card
    .getByRole("button", { name: "اختبار وحفظ نتيجة الصورة", exact: true })
    .click();
  await expect(
    card.getByText("عرض الزائر متحقق", { exact: true }),
  ).toBeVisible();
  await page.goto("/admin/settings");
  await page.getByRole("button", { name: /bridge-test.png · متحقق/ }).click();
  await page
    .getByRole("button", { name: "حفظ الإعدادات", exact: true })
    .click();
  await expect(
    page.getByText("تم حفظ إعدادات المحل", { exact: true }),
  ).toBeVisible();
  const context = await browser.newContext();
  const visitor = await context.newPage();
  await visitor.route(imageUrl, (route) =>
    route.fulfill({
      contentType: "image/png",
      body: image,
      headers: { "Access-Control-Allow-Origin": "*" },
    }),
  );
  await visitor.goto("/");
  await expect(
    visitor.locator('.site-header img[src="' + imageUrl + '"]'),
  ).toBeVisible();
  await context.close();
  fail = true;
  await page.goto("/admin/drive");
  await page
    .getByRole("button", { name: "اختبار وحفظ الربط", exact: true })
    .click();
  await expect(page.getByText(/تعذر التحقق من حساب الأدمن/)).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("اختبر الرابط المدخل واحفظه لإكمال الربط.", { exact: true }),
  ).toBeVisible();
});
