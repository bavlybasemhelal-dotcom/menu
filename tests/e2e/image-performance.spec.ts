import { test, expect } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test("real browser compression reduces large images; verified image cache survives reload without Google requests", async ({
  page,
}) => {
  await page.goto("/admin/login");
  const result = await page.evaluate(async () => {
    const path = "/src/integrations/drive/presentation.ts";
    const { presentationFile } = await import(/* @vite-ignore */ path);
    const canvas = document.createElement("canvas");
    canvas.width = 2400;
    canvas.height = 1800;
    const ctx = canvas.getContext("2d")!;
    const pixels = ctx.createImageData(canvas.width, canvas.height);
    let seed = 12345;
    for (let i = 0; i < pixels.data.length; i += 4) {
      seed = (1664525 * seed + 1013904223) >>> 0;
      pixels.data[i] = seed & 255;
      pixels.data[i + 1] = (seed >>> 8) & 255;
      pixels.data[i + 2] = (seed >>> 16) & 255;
      pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    const blob = await new Promise<Blob>((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/png"),
    );
    const input = new File([blob], "large-photo.png", { type: blob.type });
    const started = performance.now();
    const output = await presentationFile(input);
    const ms = performance.now() - started;
    const bitmap = await createImageBitmap(output);
    const data = {
      inputBytes: input.size,
      outputBytes: output.size,
      mimeType: output.type,
      width: bitmap.width,
      height: bitmap.height,
      compressionMs: Math.round(ms),
      savedPercent: Math.round((1 - output.size / input.size) * 100),
    };
    bitmap.close();
    const small = new File(
      [new Uint8Array(await output.arrayBuffer())],
      "small.webp",
      { type: "image/webp" },
    );
    const smallOutput = await presentationFile(small);
    return {
      ...data,
      smallBytes: small.size,
      smallOutputBytes: smallOutput.size,
    };
  });
  expect(result.inputBytes).toBeGreaterThan(5 * 1024 * 1024);
  expect(result.outputBytes).toBeLessThanOrEqual(192 * 1024);
  expect(result.savedPercent).toBeGreaterThan(90);
  expect(Math.max(result.width, result.height)).toBeLessThanOrEqual(1280);
  expect(result.smallOutputBytes).toBeLessThanOrEqual(result.smallBytes);
  const url =
    "https://script.google.com/macros/s/performance-test/exec?action=image&fileId=public-test";
  let calls = 0;
  await page.route(url, async (route) => {
    calls++;
    expect(route.request().headers().authorization).toBeUndefined();
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        version: 2,
        fileId: "public-test",
        mimeType: "image/png",
        fileSize: 3,
        base64: "YWJj",
      }),
    });
  });
  async function download() {
    return page.evaluate(async (url) => {
      const path = "/src/integrations/drive/image-cache.ts";
      const { publicImage } = await import(/* @vite-ignore */ path);
      const started = performance.now();
      const blob = await publicImage(url);
      return { size: blob.size, ms: Math.round(performance.now() - started) };
    }, url);
  }
  await download();
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          (await (await caches.open("catalog-public-images-v1")).keys()).length,
      ),
    )
    .toBeGreaterThan(0);
  await page.reload();
  const warm = await download();
  expect(warm.size).toBe(3);
  expect(calls).toBe(1);
  await writeFile(
    ".local/image-performance-local.json",
    JSON.stringify(
      {
        ...result,
        cachedReloadMs: warm.ms,
        googleRequestsAcrossReload: calls,
        syntheticGoogle: true,
      },
      null,
      2,
    ),
  );
});
