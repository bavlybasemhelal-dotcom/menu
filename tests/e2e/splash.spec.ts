import { test, expect, type Page, type Route } from "@playwright/test";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

const script = "https://script.google.com/macros/s/splash-test-only/exec";
const image = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAE0lEQVR4nGMUbbBlgAEmOAsvBwAp4ADa7X4xOwAAAABJRU5ErkJggg==",
  "base64",
);
// Isolated emulator metadata and synthetic Google replies are not real Drive acceptance.
async function seedLogo(id: string, name: string) {
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  const db = getFirestore(initializeApp({ projectId: "demo-souqna" }, id));
  const time = Timestamp.now();
  await db.doc("shops/main/media/" + id).set({
    name,
    driveFileId: id,
    resourceKey: null,
    driveWebViewUrl: "https://drive.google.com/file/d/" + id + "/view",
    verifiedPublicAssetUrl: script + "?action=image&fileId=" + id,
    mimeType: "image/png",
    sizeBytes: image.length,
    role: "logo",
    status: "public_test_passed",
    publicShared: true,
    anonymousRenderTestedAt: time,
    usedBy: [],
    publicUsedBy: [],
    createdAt: time,
    updatedAt: time,
  });
}
async function serveLogo(route: Route) {
  expect(route.request().headers().authorization).toBeUndefined();
  await route.fulfill({
    contentType: "application/json",
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify({
      success: true,
      version: 2,
      fileId: new URL(route.request().url()).searchParams.get("fileId"),
      mimeType: "image/png",
      fileSize: image.length,
      base64: image.toString("base64"),
    }),
  });
}
async function login(page: Page) {
  await page.route(script + "**", serveLogo);
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
async function saveIdentity(page: Page, ar: string, en: string, logo?: string) {
  await page.goto("/admin/settings");
  const group = page.getByRole("group", { name: "اسم المحل", exact: true });
  await group.getByLabel("العربية", { exact: true }).fill(ar);
  await group.getByLabel("الإنجليزية", { exact: true }).fill(en);
  if (logo) {
    await page
      .getByText("الصور السابقة واستعادة رفع غير مكتمل", { exact: true })
      .click();
    await page
      .getByRole("button", { name: logo + " · متحقق", exact: true })
      .click();
  } else if (
    await page
      .getByRole("button", { name: "إزالة الصورة", exact: true })
      .count()
  ) {
    await page
      .getByRole("button", { name: "إزالة الصورة", exact: true })
      .click();
  }
  await page
    .getByRole("button", { name: "حفظ الإعدادات", exact: true })
    .click();
  await expect(
    page.getByText("تم حفظ إعدادات المحل", { exact: true }),
  ).toBeVisible();
}

test("saved name and logo appear in the splash before dismissal, with slow Drive, long bilingual names and updated branding on revisit", async ({
  page,
  browser,
}) => {
  await seedLogo("splash-logo", "Splash test logo");
  await seedLogo("splash-replacement", "Splash replacement logo");
  await login(page);
  const ar = "مركز الضيافة والمستلزمات اليومية والخدمات المتنوعة لكل العائلة",
    en = "The Family Hospitality and Everyday Essentials Store";
  await saveIdentity(page, ar, en, "Splash test logo");
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  const visitor = await context.newPage();
  let release!: () => void,
    requested = false;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await context.route(script + "**", async (route) => {
    if (
      new URL(route.request().url()).searchParams.get("fileId") ===
      "splash-logo"
    ) {
      requested = true;
      await gate;
    }
    await serveLogo(route);
  });
  try {
    const clockStart = Date.now();
    await visitor.clock.install({ time: new Date(clockStart) });
    await visitor.goto("/");
    const splash = visitor.locator(".splash");
    await expect(splash.locator(".brand > span:last-child")).toHaveText(ar);
    await expect.poll(() => requested).toBe(true);
    await visitor.clock.pauseAt(
      new Date(await visitor.evaluate(() => Date.now() + 1000)),
    );
    await visitor.clock.runFor(2400);
    await expect(splash).toBeVisible();
    await expect(splash).toHaveAttribute("aria-busy", "true");
    release();
    await expect(splash.locator("img")).toBeVisible();
    await expect(splash).toHaveAttribute("aria-busy", "false");
    expect(
      await splash
        .locator("img")
        .evaluate((img: HTMLImageElement) => img.naturalWidth),
    ).toBe(4);
    expect(
      await splash
        .locator("img")
        .evaluate((img) => getComputedStyle(img).objectFit),
    ).toBe("contain");
    expect(
      await splash
        .locator(".brand > span:last-child")
        .evaluate((el) => getComputedStyle(el).whiteSpace),
    ).toBe("normal");
    expect(
      await splash
        .locator(".brand > span:last-child")
        .evaluate((el) => el.getBoundingClientRect().width),
    ).toBeGreaterThan(300);
    expect(
      await visitor.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await visitor.screenshot({
      path: ".local/splash-dynamic-light-ar-375.png",
    });
    await splash
      .getByRole("button", { name: "تبديل المظهر", exact: true })
      .click();
    await splash
      .getByRole("button", { name: "تبديل اللغة", exact: true })
      .click();
    await expect(splash.locator(".brand > span:last-child")).toHaveText(en);
    await expect(visitor.locator("html")).toHaveAttribute("data-theme", "dark");
    await visitor.setViewportSize({ width: 1440, height: 1000 });
    await visitor.screenshot({
      path: ".local/splash-dynamic-dark-en-1440.png",
    });
    await visitor.clock.runFor(500);
    await expect(splash).toBeVisible();
    await visitor.clock.runFor(1000);
    await expect(splash).toHaveCount(0);
    await expect(visitor.locator(".site-header .brand")).toContainText(en);
    await visitor.clock.resume();
    await visitor.reload();
    await expect(visitor.locator(".site-header .brand")).toContainText(en);
    await expect(splash).toHaveCount(0);
    await saveIdentity(
      page,
      "اسم المحل بعد التعديل",
      "Updated store identity",
      "Splash replacement logo",
    );
    await expect(visitor.locator(".site-header .brand")).toContainText(
      "Updated store identity",
    );
    await visitor.reload();
    await expect(splash.locator(".brand > span:last-child")).toHaveText(
      "Updated store identity",
    );
    await expect(splash.locator(".media-image")).toHaveAttribute(
      "data-media-id",
      "splash-replacement",
    );
    await expect(splash.locator("img")).toBeVisible();
    await splash
      .getByRole("button", { name: "Browse now", exact: true })
      .click();
    await expect(splash).toHaveCount(0);
  } finally {
    release();
    await context.close();
  }
});

test("missing or failed logo keeps the saved store name and never traps the visitor in the splash", async ({
  page,
  browser,
}) => {
  await seedLogo("splash-broken", "Splash broken logo");
  await login(page);
  await saveIdentity(
    page,
    "محل باسم محفوظ",
    "Saved store name",
    "Splash broken logo",
  );
  const context = await browser.newContext(),
    visitor = await context.newPage();
  await context.route(script + "**", (route) => route.abort("failed"));
  try {
    await visitor.goto("/");
    const splash = visitor.locator(".splash");
    await expect(splash.locator(".brand > span:last-child")).toHaveText(
      "محل باسم محفوظ",
    );
    await expect(splash).toHaveAttribute("aria-busy", "false");
    await expect(splash.locator("img")).toHaveCount(0);
    await expect(splash).toHaveCount(0);
    await saveIdentity(page, "اسم المحل بدون شعار", "Store without a logo");
    await visitor.reload();
    await expect(splash.locator(".brand > span:last-child")).toHaveText(
      "اسم المحل بدون شعار",
    );
    await expect(splash.locator("img")).toHaveCount(0);
    await splash
      .getByRole("button", { name: "تصفح الآن", exact: true })
      .click();
    await expect(splash).toHaveCount(0);
    await expect(visitor.locator(".site-header .brand")).toContainText(
      "اسم المحل بدون شعار",
    );
    // Browse can be clicked before the first store snapshot; completing that load must not repeat the splash.
    const earlyContext = await browser.newContext(),
      earlyVisitor = await earlyContext.newPage();
    let releaseStore!: () => void;
    const storeGate = new Promise<void>((resolve) => {
      releaseStore = resolve;
    });
    await earlyContext.route(
      "**/google.firestore.v1.Firestore/Listen/channel**",
      async (route) => {
        await storeGate;
        await route.continue();
      },
    );
    try {
      await earlyVisitor.goto("/");
      await expect(earlyVisitor.locator(".splash")).toHaveAttribute(
        "aria-busy",
        "true",
      );
      await earlyVisitor
        .locator(".splash")
        .getByRole("button", { name: "تصفح الآن", exact: true })
        .click();
      await expect(earlyVisitor.locator(".splash")).toHaveCount(0);
      releaseStore();
      await expect(earlyVisitor.locator(".site-header .brand")).toContainText(
        "اسم المحل بدون شعار",
      );
      await earlyVisitor.reload();
      await expect(earlyVisitor.locator(".site-header .brand")).toContainText(
        "اسم المحل بدون شعار",
      );
      await expect(earlyVisitor.locator(".splash")).toHaveCount(0);
    } finally {
      releaseStore();
      await earlyContext.close();
    }
  } finally {
    await context.close();
  }
});
