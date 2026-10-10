import { afterEach, expect, it, vi } from "vitest";

const url = (id: string) =>
  `https://script.google.com/macros/s/cache-test/exec?action=image&fileId=${id}`;
function reply(id: string) {
  return new Response(
    JSON.stringify({
      success: true,
      version: 2,
      fileId: id,
      mimeType: "image/png",
      fileSize: 3,
      base64: "YWJj",
    }),
    { headers: { "Content-Type": "application/json" } },
  );
}
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
async function cacheModule() {
  vi.resetModules();
  return import("../../src/integrations/drive/image-cache");
}
it("deduplicates downloads, caches only successful public images, and refreshes after expiry/repair", async () => {
  vi.stubGlobal("caches", undefined);
  const fetch = vi.fn(async (value: string, options?: RequestInit) => {
    expect(options?.credentials).toBe("omit");
    return reply(new URL(value).searchParams.get("fileId")!);
  });
  vi.stubGlobal("fetch", fetch);
  vi.useFakeTimers();
  const cache = await cacheModule();
  const [a, b] = await Promise.all([
    cache.publicImage(url("same")),
    cache.publicImage(url("same")),
  ]);
  expect(a.size).toBe(3);
  expect(b).toBe(a);
  await cache.publicImage(url("same"));
  expect(fetch).toHaveBeenCalledTimes(1);
  vi.setSystemTime(Date.now() + 11 * 60 * 1000);
  await cache.publicImage(url("same"));
  expect(fetch).toHaveBeenCalledTimes(2);
  cache.forgetPublicImage(url("same"));
  await cache.publicImage(url("same"));
  expect(fetch).toHaveBeenCalledTimes(3);
  fetch.mockResolvedValueOnce(
    new Response('{"success":false}', {
      headers: { "Content-Type": "application/json" },
    }),
  );
  await expect(cache.publicImage(url("private"))).rejects.toThrow();
  await cache.publicImage(url("private"));
  expect(fetch).toHaveBeenCalledTimes(5);
  await expect(
    cache.publicImage(url("bad") + "&idToken=secret"),
  ).rejects.toThrow();
  expect(fetch).toHaveBeenCalledTimes(5);
  expect(fetch.mock.calls[0][1]).toMatchObject({ credentials: "omit" });
});
it("bounds parallel network reads and gives a queued logo priority over other images", async () => {
  vi.stubGlobal("caches", undefined);
  const releases = new Map<string, () => void>(),
    order: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((value: string) => {
      const id = new URL(value).searchParams.get("fileId")!;
      order.push(id);
      return new Promise<Response>((resolve) =>
        releases.set(id, () => resolve(reply(id))),
      );
    }),
  );
  const cache = await cacheModule();
  const images = Array.from({ length: 6 }, (_, i) =>
    cache.publicImage(url("photo" + i)),
  );
  const logo = cache.publicImage(url("logo"), true);
  await vi.waitFor(() => expect(order).toHaveLength(4));
  releases.get("photo0")!();
  await vi.waitFor(() => expect(order[4]).toBe("logo"));
  releases.get("logo")!();
  await vi.waitFor(() => expect(order).toHaveLength(6));
  releases.get("photo1")!();
  await vi.waitFor(() => expect(order).toHaveLength(7));
  for (const release of releases.values()) release();
  await Promise.all([...images, logo]);
});
it("reuses bounded public browser cache across module reloads and tolerates unavailable storage", async () => {
  const entries = new Map<string, Response>();
  vi.stubGlobal("caches", {
    open: async () => ({
      match: async (key: string | Request) =>
        entries.get(typeof key === "string" ? key : key.url)?.clone(),
      put: async (key: string, response: Response) => {
        entries.set(key, response);
      },
      delete: async (key: string | Request) =>
        entries.delete(typeof key === "string" ? key : key.url),
      keys: async () => [...entries.keys()].map((key) => new Request(key)),
    }),
  });
  const fetch = vi.fn(async () => reply("persist"));
  vi.stubGlobal("fetch", fetch);
  await (await cacheModule()).publicImage(url("persist"));
  await vi.waitFor(() => expect(entries.size).toBe(1));
  await (await cacheModule()).publicImage(url("persist"));
  expect(fetch).toHaveBeenCalledTimes(1);
  vi.stubGlobal("caches", {
    open: async () => {
      throw Error("Storage blocked");
    },
  });
  await (await cacheModule()).publicImage(url("persist"));
  expect(fetch).toHaveBeenCalledTimes(2);
});
