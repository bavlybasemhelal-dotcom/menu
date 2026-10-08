import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
if (
  process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8080" ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:9099"
)
  throw Error("Refusing to seed outside local emulators");
initializeApp({ projectId: "demo-souqna" });
const auth = getAuth(),
  db = getFirestore();
try {
  await auth.createUser({
    uid: "emulator-admin",
    email: "owner@example.test",
    password: "LocalTest123!",
  });
} catch (e) {
  if (
    e.code !== "auth/uid-already-exists" &&
    e.code !== "auth/email-already-exists"
  )
    throw e;
}
const name = { ar: "متجر المعاينة", en: "Preview store" },
  empty = { ar: "", en: "" },
  time = Timestamp.now();
await db.doc("shops/main").set({
  name,
  description: {
    ar: "بيانات تجريبية على المحاكي المحلي فقط. اكتشف المنتجات والعروض وتواصل مع المحل.",
    en: "Local emulator preview data only. Explore products and offers.",
  },
  logoMediaId: null,
  whatsappNumber: "201000000000",
  facebookUrl: "https://www.facebook.com/example",
  currency: "EGP",
  defaultLanguage: "ar",
  branding: { primary: "#15803d", accent: "#ea580c" },
  updatedAt: time,
});
for (const [id, ar, en] of [
  ["fresh", "منتجات طازجة", "Fresh products"],
  ["coffee", "المشروبات", "Drinks"],
  ["daily", "احتياجات يومية", "Daily essentials"],
])
  await db.doc("shops/main/categories/" + id).set({
    name: { ar, en },
    description: empty,
    coverMediaId: null,
    order: id === "fresh" ? 0 : id === "coffee" ? 1 : 2,
    status: "published",
    createdAt: time,
    updatedAt: time,
  });
const sample = [
  ["preview-1", "تفاح طازج", "Fresh apples", "fresh", 4500, 40000],
  ["preview-2", "قهوة مختصة", "Specialty coffee", "coffee", 12000, null],
  ["preview-3", "منتج يومي", "Daily product", "daily", 3250, 30000],
  ["preview-4", "عصير فواكه", "Fruit juice", "coffee", 2500, null],
];
for (const [id, ar, en, category, price, carton] of sample)
  await db.doc("shops/main/products/" + id).set({
    name: { ar, en },
    description: {
      ar: "وصف تجريبي للمعاينة المحلية فقط.",
      en: "Example description for local preview only.",
    },
    categoryId: category,
    slug: id,
    status: "published",
    availability: "available",
    unitPriceMinor: price,
    boxPriceMinor: carton ? Math.round(price * 5) : null,
    boxQuantity: carton ? 6 : null,
    cartonBoxQuantity: carton ? 2 : null,
    cartonPriceMinor: carton,
    cartonQuantity: carton ? 12 : null,
    imageMediaIds: [],
    variants: [],
    discount:
      id === "preview-1"
        ? {
            kind: "percent",
            value: 10,
            target: "both",
            startsAt: null,
            endsAt: null,
          }
        : null,
    discountEligible: id === "preview-1",
    searchTokens: [ar, en.toLowerCase(), ...ar.split(" ")],
    createdAt: time,
    updatedAt: time,
  });
await db.doc("shops/main/offers/preview-offer").set({
  type: "special",
  status: "published",
  name: { ar: "كل جديد في محلك", en: "Discover your store" },
  description: {
    ar: "بنر تجريبي قابل للتعديل من لوحة الإدارة. بيانات المعاينة ليست بيانات إنتاج.",
    en: "Editable preview banner. Preview data is not production content.",
  },
  conditions: empty,
  imageMediaId: null,
  startsAt: null,
  endsAt: null,
  featured: true,
  displayOrder: 0,
  placement: "hero",
  bundleItems: [],
  bundleProductIds: [],
  bundleFinalPriceMinor: null,
  needsReview: false,
  productIds: [],
  specialDisplayPriceMinor: null,
  callout: { ar: "معاينة محلية", en: "Local preview" },
  createdAt: time,
  updatedAt: time,
});
console.log(
  "Seeded demo-souqna LOCAL emulators only. Login: owner@example.test / LocalTest123!",
);
