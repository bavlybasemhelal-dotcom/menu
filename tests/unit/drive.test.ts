import { it, expect, vi, afterEach } from "vitest";
import { testAnonymousImage } from "../../src/integrations/drive/client";
import {
  scriptImageUrl,
  publicImageUrl,
} from "../../src/integrations/drive/apps-script";
afterEach(() => vi.unstubAllGlobals());
it("public proof sends neither credentials nor admin Authorization", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(new Blob(["image"], { type: "image/png" })),
    );
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width: 20, height: 30, close() {} }),
  );
  const url = scriptImageUrl("test-id");
  expect(await testAnonymousImage(url)).toEqual({ width: 20, height: 30 });
  expect(fetchMock.mock.calls[0][1]).toMatchObject({ credentials: "omit" });
  expect(fetchMock.mock.calls[0][1].headers).toBeUndefined();
});
it("decodes anonymous bridge image bytes and rejects old script versions and private files", async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          version: 2,
          fileId: "image-id",
          mimeType: "image/webp",
          fileSize: 3,
          base64: "YWJj",
        }),
        { headers: { "Content-Type": "application/json" } },
      ),
    );
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn().mockResolvedValue({ width: 4, height: 4, close() {} }),
  );
  const url = publicImageUrl(
    "https://script.google.com/macros/s/test/exec",
    "image-id",
  );
  expect(await testAnonymousImage(url)).toEqual({ width: 4, height: 4 });
  expect(fetchMock.mock.calls[0][1]).toMatchObject({
    credentials: "omit",
    redirect: "follow",
  });
  expect(fetchMock.mock.calls[0][1].headers).toBeUndefined();
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify({ success: true, version: 1 }), {
      headers: { "Content-Type": "application/json" },
    }),
  );
  await expect(testAnonymousImage(url)).rejects.toThrow(
    "Update the Drive script",
  );
  for (const payload of [
    { success: false },
    { success: true, version: 2, fileId: "other" },
    { success: true, version: 2, fileId: "image-id", mimeType: "text/html" },
  ]) {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(payload), {
        headers: { "Content-Type": "application/json" },
      }),
    );
    await expect(testAnonymousImage(url)).rejects.toThrow();
  }
});
it("rejects sharing pages and HTML/failed reads instead of claiming completion", async () => {
  await expect(
    testAnonymousImage("https://drive.google.com/file/d/abc/view"),
  ).rejects.toThrow();
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValue(
        new Response("HTML", { headers: { "Content-Type": "text/html" } }),
      ),
  );
  await expect(testAnonymousImage(scriptImageUrl("id"))).rejects.toThrow(
    "not an image",
  );
});
