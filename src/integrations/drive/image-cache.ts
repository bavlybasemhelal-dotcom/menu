import { anonymousImageBlob } from "./client";
import { isDriveAssetUrl } from "../../utils/urls";

const CACHE = "catalog-public-images-v1";
const TTL = 10 * 60 * 1000;
const MAX_BYTES = 24 * 1024 * 1024;
const MAX_ITEMS = 64;
const memory = new Map<string, { blob: Blob; expires: number }>();
const requests = new Map<string, Promise<Blob>>();
const waiting: { run: () => void; priority: boolean }[] = [];
let active = 0;
let diskWork = Promise.resolve();

function remember(url: string, blob: Blob, expires = Date.now() + TTL) {
  memory.delete(url);
  memory.set(url, { blob, expires });
  let bytes = [...memory.values()].reduce(
    (total, item) => total + item.blob.size,
    0,
  );
  for (const [key, item] of memory) {
    if (bytes <= MAX_BYTES && memory.size <= MAX_ITEMS) break;
    memory.delete(key);
    bytes -= item.blob.size;
  }
}
function diskCache() {
  return typeof caches === "undefined" ? null : caches.open(CACHE);
}
async function diskRead(url: string) {
  try {
    const cache = await diskCache();
    const response = await cache?.match(url);
    if (!response) return null;
    const expires = Number(response.headers.get("X-Catalog-Expires"));
    if (expires <= Date.now() || !expires) {
      await cache?.delete(url);
      return null;
    }
    const blob = await response.blob();
    if (
      !blob.type.startsWith("image/") ||
      !blob.size ||
      blob.size > MAX_BYTES
    ) {
      await cache?.delete(url);
      return null;
    }
    remember(url, blob, expires);
    return blob;
  } catch {
    return null; // Storage disabled/full must never break display.
  }
}
export function primePublicImage(url: string, blob: Blob) {
  if (!isDriveAssetUrl(url) || !blob.type.startsWith("image/") || !blob.size)
    return;
  remember(url, blob);
  // Serialize trimming without holding up the upload/publication operation.
  diskWork = diskWork.then(async () => {
    try {
      const cache = await diskCache();
      if (!cache || blob.size > MAX_BYTES) return;
      await cache.delete(url);
      await cache.put(
        url,
        new Response(blob, {
          headers: {
            "Content-Type": blob.type,
            "Content-Length": String(blob.size),
            "X-Catalog-Expires": String(Date.now() + TTL),
          },
        }),
      );
      const keys = await cache.keys();
      let bytes = 0,
        count = 0;
      for (const key of [...keys].reverse()) {
        const item = await cache.match(key);
        const size = Number(item?.headers.get("Content-Length") || MAX_BYTES);
        const expires = Number(item?.headers.get("X-Catalog-Expires") || 0);
        if (
          expires <= Date.now() ||
          count >= MAX_ITEMS ||
          bytes + size > MAX_BYTES
        )
          await cache.delete(key);
        else {
          bytes += size;
          count++;
        }
      }
    } catch {
      /* Optional browser cache; memory/network still work. */
    }
  });
}
export function forgetPublicImage(url: string) {
  memory.delete(url);
  diskWork = diskWork.then(async () => {
    try {
      await (await diskCache())?.delete(url);
    } catch {
      /* optional cache */
    }
  });
}
function drain() {
  while (active < 4 && waiting.length) {
    const index = waiting.findIndex((item) => item.priority);
    const item = waiting.splice(index < 0 ? 0 : index, 1)[0];
    active++;
    item.run();
  }
}
function networkImage(url: string, priority: boolean) {
  return new Promise<Blob>((resolve, reject) => {
    waiting.push({
      priority,
      run: () => {
        void anonymousImageBlob(url)
          .then(resolve, reject)
          .finally(() => {
            active--;
            drain();
          });
      },
    });
    drain();
  });
}
// Call only after a fresh authorized Firestore metadata read. Never cache originals,
// auth responses or failures. Replacement assets have separate immutable Drive IDs.
export function publicImage(url: string, priority = false): Promise<Blob> {
  if (!isDriveAssetUrl(url))
    return Promise.reject(Error("Unsupported public image URL"));
  const cached = memory.get(url);
  if (cached && cached.expires > Date.now()) {
    remember(url, cached.blob, cached.expires);
    return Promise.resolve(cached.blob);
  }
  memory.delete(url);
  let request = requests.get(url);
  if (!request) {
    request = (async () => {
      const stored = await diskRead(url);
      if (stored) return stored;
      const blob = await networkImage(url, priority);
      primePublicImage(url, blob);
      return blob;
    })().finally(() => requests.delete(url));
    requests.set(url, request);
  }
  return request;
}
