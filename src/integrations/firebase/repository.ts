import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import type {
  CategoryData,
  CollectionName,
  Media,
  OfferData,
  PrivateConfig,
  ProductData,
  StorePublic,
} from "../../features/products/models";
import {
  categorySchema,
  offerSchema,
  productSchema,
  storeSchema,
} from "../../features/products/models";
import { searchTokens } from "../../features/products/logic";
import { db, shopId } from "./client";
import { decode, encode } from "./codec";
export function database() {
  if (!db)
    throw Error("Firebase configuration missing / إعداد Firebase غير مكتمل");
  return db;
}
export const shopRef = () => doc(database(), "shops", shopId);
export const configRef = () => doc(database(), "privateShopConfig", shopId);
export const items = (name: CollectionName) =>
  collection(database(), "shops", shopId, name);
type RecordData = Record<string, unknown>;
function refs(kind: string, data: RecordData | null): string[] {
  if (!data) return [];
  if (kind === "products") return (data.imageMediaIds as string[]) || [];
  const key =
    kind === "shop"
      ? "logoMediaId"
      : kind === "categories"
        ? "coverMediaId"
        : "imageMediaId";
  return data[key] ? [String(data[key])] : [];
}
function published(kind: string, data: RecordData | null) {
  return !!data && (kind === "shop" || data.status === "published");
}
async function persist(
  kind: CollectionName | "shop",
  id: string,
  data: RecordData | null,
) {
  const ref = kind === "shop" ? shopRef() : doc(items(kind), id);
  await runTransaction(database(), async (tx) => {
    const oldSnap = await tx.get(ref);
    const old = oldSnap.exists()
      ? (decode(oldSnap.data()) as RecordData)
      : null;
    const oldIds = refs(kind, old),
      newIds = refs(kind, data),
      ids = [...new Set([...oldIds, ...newIds])];
    const mediaSnaps = await Promise.all(
      ids.map((mid) => tx.get(doc(items("media"), mid))),
    );
    const usage = kind + "/" + id;
    for (let i = 0; i < ids.length; i++) {
      const snap = mediaSnaps[i];
      if (!snap.exists()) {
        if (newIds.includes(ids[i]))
          throw Error("Media record missing / ملف الوسائط غير موجود");
        continue;
      }
      const m = decode(snap.data()) as Omit<Media, "id">;
      const attached = newIds.includes(ids[i]);
      if (attached && m.status === "failed")
        throw Error(
          "Media operation pending or failed / عملية الملف معلقة أو فشلت",
        );
      if (
        attached &&
        published(kind, data) &&
        (m.status !== "public_test_passed" ||
          !m.publicShared ||
          !m.verifiedPublicAssetUrl)
      )
        throw Error(
          "Public media test required before publishing / اختبر عرض الوسائط للزائر قبل النشر",
        );
      const usedBy = [
        ...new Set([
          ...m.usedBy.filter((v) => v !== usage),
          ...(attached ? [usage] : []),
        ]),
      ];
      const publicUsedBy = [
        ...new Set([
          ...m.publicUsedBy.filter((v) => v !== usage),
          ...(attached && published(kind, data) ? [usage] : []),
        ]),
      ];
      if (usedBy.length > 200 || publicUsedBy.length > 200)
        throw Error("Media usage limit reached / تجاوز الملف حد المراجع");
      tx.update(snap.ref, {
        usedBy,
        publicUsedBy,
        updatedAt: serverTimestamp(),
      });
    }
    if (data)
      tx.set(ref, {
        ...encode(data),
        ...(kind === "shop"
          ? {}
          : {
              createdAt: oldSnap.exists()
                ? oldSnap.data().createdAt
                : serverTimestamp(),
            }),
        updatedAt: serverTimestamp(),
      });
    else tx.delete(ref);
  });
  return id;
}
async function invalidateBundles(productId: string) {
  const snap = await getDocs(
    query(
      items("offers"),
      where("bundleProductIds", "array-contains", productId),
    ),
  );
  for (let i = 0; i < snap.docs.length; i += 15) {
    const group = snap.docs.slice(i, i + 15);
    for (const d of group) {
      const value = decode(d.data()) as RecordData;
      await persist("offers", d.id, {
        ...strip(value),
        needsReview: true,
        status: "hidden",
      });
    }
  }
}
export function strip(data: RecordData) {
  const { id: _id, createdAt: _created, updatedAt: _updated, ...rest } = data;
  void _id;
  void _created;
  void _updated;
  return rest;
}
export async function saveProduct(value: ProductData, id?: string) {
  const p = productSchema.parse(value);
  if (id) await invalidateBundles(id);
  return persist("products", id || doc(items("products")).id, {
    ...p,
    searchTokens: searchTokens(p.name),
    discountEligible: !!p.discount && p.discount.value > 0,
  });
}
export async function saveCategory(value: CategoryData, id?: string) {
  const data = categorySchema.parse(value);
  if (id && data.status === "hidden") {
    let page;
    do {
      page = await getDocs(
        query(
          items("products"),
          where("categoryId", "==", id),
          where("status", "==", "published"),
          limit(20),
        ),
      );
      for (const d of page.docs) {
        const p = decode(d.data()) as RecordData;
        await invalidateBundles(d.id);
        await persist("products", d.id, { ...strip(p), status: "hidden" });
      }
    } while (!page.empty);
  }
  return persist("categories", id || doc(items("categories")).id, data);
}
export function saveOffer(value: OfferData, id?: string) {
  const o = offerSchema.parse(value);
  return persist("offers", id || doc(items("offers")).id, {
    ...o,
    bundleProductIds: [...new Set(o.bundleItems.map((v) => v.productId))],
  });
}
export function saveStore(value: StorePublic) {
  return persist(
    "shop",
    shopId,
    storeSchema.parse(strip(value as unknown as RecordData)),
  );
}
export async function removeContent(kind: CollectionName, id: string) {
  if (kind === "products") await invalidateBundles(id);
  if (kind === "categories") {
    const products = await getDocs(
      query(items("products"), where("categoryId", "==", id), limit(1)),
    );
    if (!products.empty)
      throw Error(
        "Move products before removing a category / انقل المنتجات قبل حذف القسم",
      );
  }
  if (kind === "media") {
    const ref = doc(items(kind), id);
    await runTransaction(database(), async (tx) => {
      const s = await tx.get(ref);
      if (s.exists() && s.data().usedBy.length)
        throw Error("Media is in use / الملف مستخدم");
      const originalId = s.data()?.originalMediaId;
      const original = originalId
        ? await tx.get(doc(items("media"), originalId))
        : null;
      if (original?.exists())
        tx.update(original.ref, {
          usedBy: original
            .data()
            .usedBy.filter((v: string) => v !== "media/" + id),
          updatedAt: serverTimestamp(),
        });
      tx.delete(ref);
    });
    return;
  }
  return persist(kind, id, null);
}
export async function saveMedia(
  data: Omit<Media, "id" | "createdAt" | "updatedAt">,
  id?: string,
) {
  const ref = doc(items("media"), id || doc(items("media")).id);
  await runTransaction(database(), async (tx) => {
    const old = await tx.get(ref);
    if (
      old.exists() &&
      old.data().status === "failed" &&
      data.status === "public_test_passed"
    )
      throw Error(
        "Complete or retry the media operation first / أكمل أو أعد عملية الملف أولاً",
      );
    const original = data.originalMediaId
      ? await tx.get(doc(items("media"), data.originalMediaId))
      : null;
    if (original && !original.exists()) throw Error("Original media missing");
    if (original?.exists())
      tx.update(original.ref, {
        usedBy: [...new Set([...original.data().usedBy, "media/" + ref.id])],
        updatedAt: serverTimestamp(),
      });
    tx.set(ref, {
      ...encode(data),
      ...(old.exists()
        ? { usedBy: old.data().usedBy, publicUsedBy: old.data().publicUsedBy }
        : {}),
      createdAt: old.exists() ? old.data().createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });
  return ref.id;
}
export async function recoverMedia(
  data: Omit<Media, "id" | "createdAt" | "updatedAt">,
) {
  const existing = await getDocs(
    query(
      items("media"),
      where("driveFileId", "==", data.driveFileId),
      limit(1),
    ),
  );
  return existing.empty ? saveMedia(data) : existing.docs[0].id;
}
export async function savePrivate(value: PrivateConfig) {
  const batch = writeBatch(database());
  batch.set(configRef(), {
    ...encode({ ...value }),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}
export async function reserveMediaRevoke(id: string) {
  return runTransaction(database(), async (tx) => {
    const ref = doc(items("media"), id),
      snap = await tx.get(ref);
    if (!snap.exists() || snap.data().usedBy.length)
      throw Error("Media is in use or missing / الملف مستخدم أو غير موجود");
    tx.update(ref, {
      status: "failed",
      verifiedPublicAssetUrl: null,
      anonymousRenderTestedAt: null,
      updatedAt: serverTimestamp(),
    });
    return snap.data().driveFileId as string;
  });
}
