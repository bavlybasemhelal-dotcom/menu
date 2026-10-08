import { readFileSync } from "node:fs";
import { beforeAll, beforeEach, afterAll, it, expect } from "vitest";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import {
  emptyProduct,
  emptyStore,
  emptyText,
  emptyOffer,
} from "../../src/features/products/models";
import { emptyConfig } from "../../src/integrations/drive/config";
let env: RulesTestEnvironment;
const admin = () => env.authenticatedContext("emulator-admin").firestore();
const stranger = () => env.authenticatedContext("stranger").firestore();
const visitor = () => env.unauthenticatedContext().firestore();
it("Apps Script configuration is admin-only, validates endpoints and does not accept stored tokens", async () => {
  const path = "privateShopConfig/main";
  const config = {
    ...emptyConfig,
    webAppUrl: "https://script.google.com/macros/s/test-deployment/exec",
    scriptConnected: true,
    rootFolderId: "root-folder",
    lastTestedAt: Timestamp.now(),
    updatedAt: serverTimestamp(),
  };
  await assertSucceeds(setDoc(doc(admin(), path), config));
  await assertFails(getDoc(doc(visitor(), path)));
  await assertFails(setDoc(doc(stranger(), path), config));
  await assertFails(
    setDoc(doc(admin(), path), {
      ...config,
      webAppUrl: "https://attacker.test/exec",
    }),
  );
  await assertFails(
    setDoc(doc(admin(), path), { ...config, accessToken: "must-not-store" }),
  );
  await assertFails(
    setDoc(doc(admin(), path), { ...config, lastTestedAt: null }),
  );
  await assertFails(setDoc(doc(admin(), path), { ...config, driveProvider: "oauth" }));
  await assertFails(setDoc(doc(admin(), path), { ...config, googleClientId: "removed-client" }));
  await assertFails(setDoc(doc(admin(), path), { ...config, maxVideoBytes: 21 * 1024 * 1024 }));
});
it("Drive bridge media needs explicit anonymous image proof before published use", async () => {
  const path = "shops/main/media/script-image";
  const asset = {
    name: "logo.png",
    driveFileId: "script-file",
    resourceKey: null,
    driveWebViewUrl: "https://drive.google.com/file/d/script-file/view",
    verifiedPublicAssetUrl: null,
    mimeType: "image/png",
    sizeBytes: 10,
    role: "image",
    status: "metadata_saved",
    storageProvider: "apps_script",
    driveDirectUrl: "https://drive.usercontent.google.com/download?export=view&id=script-file",
    driveDownloadUrl:
      "https://drive.google.com/uc?export=download&id=script-file",
    driveFolderId: "folder",
    driveFolderName: "Branding",
    publicShared: false,
    anonymousRenderTestedAt: null,
    usedBy: [],
    publicUsedBy: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await assertSucceeds(setDoc(doc(admin(), path), asset));
  await assertFails(getDoc(doc(visitor(), path)));
  await assertFails(
    setDoc(doc(admin(), "shops/main"), {
      ...emptyStore(),
      name: { ar: "متجر", en: "Shop" },
      logoMediaId: "script-image",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    setDoc(doc(admin(), path), { ...asset, status: "public_test_passed" }),
  );
  const ready = {
    ...asset,
    status: "public_test_passed",
    publicShared: true,
    anonymousRenderTestedAt: Timestamp.now(),
    verifiedPublicAssetUrl: asset.driveDirectUrl,
    publicUsedBy: ["shop/main"],
  };
  await assertSucceeds(setDoc(doc(admin(), path), ready));
  await assertSucceeds(getDoc(doc(visitor(), path)));
  await assertFails(
    setDoc(doc(admin(), path), {
      ...ready,
      verifiedPublicAssetUrl:
        ready.verifiedPublicAssetUrl + "&access_token=private",
    }),
  );
});
const baseCategory = {
  name: { ar: "قسم", en: "Category" },
  description: emptyText(),
  order: 0,
  coverMediaId: null,
  status: "published",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
};
const product = (status = "published") => ({
  ...emptyProduct(),
  name: { ar: "منتج", en: "Product" },
  categoryId: "c",
  status,
  searchTokens: ["p"],
  discountEligible: false,
  unitPriceMinor: 1234,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});
beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-souqna",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8").replace(
        /function allowedUid\(\) \{ return '[^']+'; \}/,
        "function allowedUid() { return 'emulator-admin'; }",
      ),
    },
  });
});
beforeEach(async () => {
  await env.clearFirestore();
  await assertSucceeds(
    setDoc(doc(admin(), "shops/main/categories/c"), baseCategory),
  );
});
afterAll(async () => {
  await env.cleanup();
});
it("published-only reads and anonymous/non-admin writes denied", async () => {
  await assertSucceeds(
    setDoc(doc(admin(), "shops/main/products/p"), product()),
  );
  await assertSucceeds(
    setDoc(doc(admin(), "shops/main/products/d"), product("draft")),
  );
  await assertSucceeds(getDoc(doc(visitor(), "shops/main/products/p")));
  await assertFails(getDoc(doc(visitor(), "shops/main/products/d")));
  await assertFails(getDocs(collection(visitor(), "shops/main/products")));
  expect(
    (
      await assertSucceeds(
        getDocs(
          query(
            collection(visitor(), "shops/main/products"),
            where("status", "==", "published"),
          ),
        ),
      )
    ).size,
  ).toBe(1);
  await assertFails(setDoc(doc(visitor(), "shops/main/products/x"), product()));
  await assertFails(
    setDoc(doc(stranger(), "shops/main/products/x"), product()),
  );
});
it("private config and self-granted roles are inaccessible", async () => {
  await assertFails(getDoc(doc(visitor(), "privateShopConfig/main")));
  await assertFails(getDoc(doc(stranger(), "privateShopConfig/main")));
  await assertFails(
    setDoc(doc(stranger(), "roles/stranger"), { isAdmin: true }),
  );
  await assertFails(
    setDoc(doc(stranger(), "deploymentConfig/main"), { uid: "stranger" }),
  );
});
it("rejects invalid prices, types, dates, unsafe URLs and secret fields even for admin", async () => {
  await assertFails(
    setDoc(doc(admin(), "shops/main/products/p"), {
      ...product(),
      unitPriceMinor: -1,
    }),
  );
  await assertFails(
    setDoc(doc(admin(), "shops/main/products/p"), {
      ...product(),
      unitPriceMinor: 1.2,
    }),
  );
  await assertFails(
    setDoc(doc(admin(), "shops/main/products/p"), {
      ...product(),
      accessToken: "bad",
    }),
  );
  await assertFails(
    setDoc(doc(admin(), "shops/main/products/p"), {
      ...product(),
      discount: {
        kind: "percent",
        value: 101,
        target: "unit",
        startsAt: null,
        endsAt: null,
      },
    }),
  );
  await assertFails(
    setDoc(doc(admin(), "shops/main/products/p"), {
      ...product(),
      discount: {
        kind: "fixed",
        value: 1235,
        target: "unit",
        startsAt: null,
        endsAt: null,
      },
    }),
  );
  await assertFails(
    setDoc(doc(admin(), "shops/main/products/p"), {
      ...product(),
      discount: {
        kind: "percent",
        value: 10,
        target: "unit",
        startsAt: Timestamp.fromMillis(2000),
        endsAt: Timestamp.fromMillis(1000),
      },
    }),
  );
  await assertFails(
    setDoc(doc(admin(), "shops/main"), {
      ...emptyStore(),
      name: { ar: "متجر", en: "Shop" },
      facebookUrl: "javascript:alert(1)",
      updatedAt: serverTimestamp(),
    }),
  );
});
it("publish gate rejects unverified/private images and hidden categories", async () => {
  await assertFails(
    setDoc(doc(admin(), "shops/main/products/p"), {
      ...product(),
      imageMediaIds: ["not-verified"],
    }),
  );
  await setDoc(doc(admin(), "shops/main/categories/c"), {
    ...baseCategory,
    status: "hidden",
  });
  await assertFails(setDoc(doc(admin(), "shops/main/products/p"), product()));
});
it("requires independent bundle price and visible valid member references", async () => {
  await setDoc(doc(admin(), "shops/main/products/p"), product());
  const o = {
    ...emptyOffer(),
    name: { ar: "باقة", en: "Bundle" },
    type: "bundle",
    status: "published",
    bundleItems: [{ productId: "p", quantity: 2, unit: "unit" }],
    bundleProductIds: ["p"],
    bundleFinalPriceMinor: 3000,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await assertSucceeds(setDoc(doc(admin(), "shops/main/offers/o"), o));
  await assertFails(
    setDoc(doc(admin(), "shops/main/offers/o"), {
      ...o,
      bundleItems: [{ productId: "p", quantity: 2, unit: "carton" }],
    }),
  );
  await assertFails(
    setDoc(doc(admin(), "shops/main/offers/o"), { ...o, needsReview: true }),
  );
  await assertFails(
    setDoc(doc(admin(), "shops/main/offers/o"), {
      ...o,
      bundleFinalPriceMinor: null,
    }),
  );
});
it("validates box/carton hierarchy and all configured selling prices on the server", async () => {
  const p = {
    ...product(),
    unitPriceMinor: null,
    boxPriceMinor: 2500,
    cartonPriceMinor: 9000,
    boxQuantity: 6,
    cartonBoxQuantity: 4,
  };
  await assertSucceeds(setDoc(doc(admin(), "shops/main/products/p"), p));
  await assertSucceeds(getDoc(doc(visitor(), "shops/main/products/p")));
  await assertFails(
    setDoc(doc(admin(), "shops/main/products/p"), { ...p, boxQuantity: 0 }),
  );
  await assertFails(
    setDoc(doc(admin(), "shops/main/products/p"), {
      ...p,
      cartonBoxQuantity: null,
    }),
  );
  await assertFails(
    setDoc(doc(admin(), "shops/main/products/p"), {
      ...p,
      boxPriceMinor: null,
      cartonPriceMinor: null,
    }),
  );
  await assertFails(
    setDoc(doc(admin(), "shops/main/products/p"), {
      ...p,
      discount: {
        kind: "fixed",
        value: 2501,
        target: "box",
        startsAt: null,
        endsAt: null,
      },
    }),
  );
  const o = {
    ...emptyOffer(),
    name: { ar: "باقة علب", en: "Box bundle" },
    type: "bundle",
    status: "published",
    bundleItems: [{ productId: "p", quantity: 2, unit: "box" }],
    bundleProductIds: ["p"],
    bundleFinalPriceMinor: 3000,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await assertSucceeds(setDoc(doc(admin(), "shops/main/offers/box"), o));
  await assertFails(
    setDoc(doc(admin(), "shops/main/offers/box"), {
      ...o,
      bundleItems: [{ productId: "p", quantity: 2, unit: "unit" }],
    }),
  );
});
