import { it, expect, vi, afterEach } from "vitest";
import { testAnonymousImage } from "../../src/integrations/drive/client";
import { scriptImageUrl } from "../../src/integrations/drive/apps-script";
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
