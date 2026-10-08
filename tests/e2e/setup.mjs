import { execFileSync } from "node:child_process";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
export default async function setup() {
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  const reset = await fetch(
    "http://127.0.0.1:8080/emulator/v1/projects/demo-souqna/databases/(default)/documents",
    { method: "DELETE" },
  );
  if (!reset.ok) throw Error("Local emulator reset failed");
  execFileSync(process.execPath, ["scripts/seed-emulator.mjs"], {
    stdio: "inherit",
    env: process.env,
  });
  initializeApp({ projectId: "demo-souqna" }, "browser-tests");
  const time = Timestamp.now();
  await getFirestore(
    (await import("firebase-admin/app")).getApp("browser-tests"),
  )
    .doc("shops/main/media/test-logo")
    .set({
      name: "Browser test logo",
      driveFileId: "test-logo",
      resourceKey: null,
      driveWebViewUrl: "https://drive.google.com/file/d/test-logo/view",
      verifiedPublicAssetUrl:
        "https://drive.usercontent.google.com/download?export=view&id=test-logo",
      mimeType: "image/png",
      sizeBytes: 100,
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
