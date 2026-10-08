import { z } from "zod";
export const localizedSchema = z
  .object({ ar: z.string().max(200), en: z.string().max(200) })
  .strict()
  .refine(
    (v) => !!(v.ar.trim() || v.en.trim()),
    "Name is required / الاسم مطلوب",
  );
export const textSchema = z
  .object({ ar: z.string().max(4000), en: z.string().max(4000) })
  .strict();
export const moneySchema = z.number().int().min(0).max(1_000_000_000);
export const statusSchema = z.enum(["draft", "published", "hidden"]);
const schedule = {
  startsAt: z.number().nullable(),
  endsAt: z.number().nullable(),
};
export const discountSchema = z
  .object({
    kind: z.enum(["percent", "fixed"]),
    value: z.number().min(0),
    target: z.enum(["unit", "box", "carton", "both", "all"]),
    ...schedule,
  })
  .strict()
  .superRefine((d, c) => {
    if (d.kind === "percent" && d.value > 100)
      c.addIssue({
        code: "custom",
        message: "Percentage exceeds 100 / النسبة تتجاوز ١٠٠٪",
      });
    if (d.kind === "fixed" && !Number.isSafeInteger(d.value))
      c.addIssue({
        code: "custom",
        message: "Fixed discount must be minor units / الخصم مبلغ صحيح بالقروش",
      });
    if (d.startsAt !== null && d.endsAt !== null && d.endsAt < d.startsAt)
      c.addIssue({
        code: "custom",
        message: "End must follow start / النهاية قبل البداية",
      });
  });
export const variantSchema = z
  .object({
    id: z.string().min(1).max(100),
    label: localizedSchema,
    kind: z.enum(["size", "color", "option"]),
    unitPriceMinor: moneySchema.nullable(),
    available: z.boolean(),
  })
  .strict();
export const productSchema = z
  .object({
    name: localizedSchema,
    description: textSchema,
    categoryId: z.string().min(1).max(100),
    slug: z.string().max(200),
    status: statusSchema,
    availability: z.enum(["available", "limited", "unavailable"]),
    unitPriceMinor: moneySchema.nullable(),
    boxPriceMinor: moneySchema.nullable().default(null),
    boxQuantity: z
      .number()
      .int()
      .positive()
      .max(100000)
      .nullable()
      .default(null),
    cartonBoxQuantity: z
      .number()
      .int()
      .positive()
      .max(100000)
      .nullable()
      .default(null),
    cartonPriceMinor: moneySchema.nullable(),
    cartonQuantity: z.number().int().positive().max(100000).nullable(),
    imageMediaIds: z.array(z.string().min(1).max(100)).max(6),
    variants: z.array(variantSchema).max(12),
    discount: discountSchema.nullable(),
  })
  .strict()
  .superRefine((p, c) => {
    if (
      p.unitPriceMinor === null &&
      p.boxPriceMinor === null &&
      p.cartonPriceMinor === null
    )
      c.addIssue({
        code: "custom",
        message:
          "Set at least one selling price / أدخل سعر مستوى بيع واحد على الأقل",
      });
    if (
      (p.boxPriceMinor !== null || p.cartonPriceMinor !== null) &&
      p.boxQuantity === null
    )
      c.addIssue({
        code: "custom",
        message: "Pieces per box required / عدد القطع داخل العلبة مطلوب",
      });
    if (p.cartonPriceMinor !== null && p.cartonBoxQuantity === null)
      c.addIssue({
        code: "custom",
        message: "Boxes per carton required / عدد العلب داخل الكرتونة مطلوب",
      });
    const applies = (target: string, unit: string) =>
      target === unit ||
      target === "all" ||
      (target === "both" && unit !== "box");
    if (p.discount?.kind === "fixed") {
      const d = p.discount;
      if (
        applies(d.target, "unit") &&
        p.unitPriceMinor !== null &&
        d.value > p.unitPriceMinor
      )
        c.addIssue({
          code: "custom",
          message: "Discount exceeds unit price / الخصم أكبر من سعر القطعة",
        });
      if (
        applies(d.target, "carton") &&
        p.cartonPriceMinor !== null &&
        d.value > p.cartonPriceMinor
      )
        c.addIssue({
          code: "custom",
          message: "Discount exceeds carton price / الخصم أكبر من سعر الكرتونة",
        });
      for (const v of p.variants)
        if (
          applies(d.target, "unit") &&
          v.unitPriceMinor !== null &&
          d.value > v.unitPriceMinor
        )
          c.addIssue({
            code: "custom",
            message:
              "Discount exceeds variant price / الخصم أكبر من سعر الخيار",
          });
      if (
        applies(d.target, "box") &&
        p.boxPriceMinor !== null &&
        d.value > p.boxPriceMinor
      )
        c.addIssue({
          code: "custom",
          message: "Discount exceeds box price / الخصم أكبر من سعر العلبة",
        });
    }
    if (p.discount?.target === "box" && p.boxPriceMinor === null)
      c.addIssue({
        code: "custom",
        message: "No box price / أدخل سعر العلبة أولاً",
      });
    if (p.discount?.target === "unit" && p.unitPriceMinor === null)
      c.addIssue({
        code: "custom",
        message: "No piece price / أدخل سعر القطعة أولاً",
      });
    if (p.discount?.target === "carton" && p.cartonPriceMinor === null)
      c.addIssue({
        code: "custom",
        message: "No carton price / أدخل سعر الكرتونة أولاً",
      });
  });
export const categorySchema = z
  .object({
    name: localizedSchema,
    description: textSchema,
    order: z.number().int().min(0).max(100000),
    coverMediaId: z.string().max(100).nullable(),
    status: z.enum(["published", "hidden"]),
  })
  .strict();
export const storeSchema = z
  .object({
    name: localizedSchema,
    description: textSchema,
    logoMediaId: z.string().max(100).nullable(),
    whatsappNumber: z
      .string()
      .regex(
        /^$|^[1-9][0-9]{6,14}$/,
        "International digits required / رقم دولي بالأرقام فقط",
      ),
    facebookUrl: z
      .string()
      .refine(
        (s) => s === "" || /^https:\/\/(www\.|m\.)?facebook\.com\//i.test(s),
        "Facebook HTTPS URL required / رابط فيسبوك آمن",
      ),
    currency: z.enum(["EGP", "USD", "SAR", "AED", "EUR"]),
    defaultLanguage: z.enum(["ar", "en"]),
    branding: z
      .object({
        primary: z.string().regex(/^#[0-9a-f]{6}$/i),
        accent: z.string().regex(/^#[0-9a-f]{6}$/i),
      })
      .strict(),
  })
  .strict();
export const offerSchema = z
  .object({
    type: z.enum(["bundle", "special"]),
    status: statusSchema,
    name: localizedSchema,
    description: textSchema,
    conditions: textSchema,
    imageMediaId: z.string().max(100).nullable(),
    ...schedule,
    featured: z.boolean(),
    displayOrder: z.number().int().min(0).max(100000),
    placement: z.enum(["none", "hero", "strip"]),
    bundleItems: z
      .array(
        z
          .object({
            productId: z.string().min(1).max(100),
            quantity: z.number().int().positive().max(100000),
            unit: z.enum(["unit", "box", "carton"]),
          })
          .strict(),
      )
      .max(6),
    bundleFinalPriceMinor: moneySchema.nullable(),
    needsReview: z.boolean(),
    productIds: z.array(z.string().max(100)).max(6),
    specialDisplayPriceMinor: moneySchema.nullable(),
    callout: textSchema,
  })
  .strict()
  .superRefine((o, c) => {
    if (o.startsAt !== null && o.endsAt !== null && o.endsAt < o.startsAt)
      c.addIssue({
        code: "custom",
        message: "End must follow start / النهاية قبل البداية",
      });
    if (
      o.type === "bundle" &&
      (!o.bundleItems.length || o.bundleFinalPriceMinor === null)
    )
      c.addIssue({
        code: "custom",
        message: "Bundle items and price required / أدخل عناصر وسعر الباقة",
      });
    if (o.status === "published" && o.needsReview)
      c.addIssue({
        code: "custom",
        message: "Review bundle before publishing / راجع الباقة قبل النشر",
      });
  });
export type Localized = z.infer<typeof localizedSchema>;
export type Discount = z.infer<typeof discountSchema>;
export type ProductData = z.infer<typeof productSchema>;
export type CategoryData = z.infer<typeof categorySchema>;
export type StorePublic = z.infer<typeof storeSchema>;
export type OfferData = z.infer<typeof offerSchema>;
export type Entity<T> = T & {
  id: string;
  createdAt: number;
  updatedAt: number;
};
export type Product = Entity<ProductData> & {
  searchTokens: string[];
  discountEligible: boolean;
};
export type Category = Entity<CategoryData>;
export type Offer = Entity<OfferData> & { bundleProductIds: string[] };
export type Media = Entity<{
  name: string;
  driveFileId: string;
  resourceKey: string | null;
  driveWebViewUrl: string;
  verifiedPublicAssetUrl: string | null;
  mimeType: string;
  sizeBytes: number;
  originalMediaId?: string | null;
  storageProvider?: "apps_script";
  driveDirectUrl?: string;
  driveDownloadUrl?: string;
  driveFolderId?: string;
  driveFolderName?: string;
  role: "image" | "video" | "document" | "logo";
  status:
    "metadata_saved" | "public_test_passed" | "private" | "orphan" | "failed";
  publicShared: boolean;
  anonymousRenderTestedAt: number | null;
  usedBy: string[];
  publicUsedBy: string[];
}>;
export interface PrivateConfig {
  driveProvider?: "apps_script";
  googleEmail?: string;
  webAppUrl?: string;
  scriptConnected?: boolean;
  lastTestedAt?: number | null;
  rootFolderId?: string;
  rootFolderName?: string;
  storageUsedBytes?: number | null;
  maxImageBytes: number;
  maxVideoBytes: number;
  maxDocumentBytes: number;
}
export type CollectionName = "products" | "categories" | "offers" | "media";
export type CollectionModels = {
  products: Product;
  categories: Category;
  offers: Offer;
  media: Media;
};
export const emptyText = (): Localized => ({ ar: "", en: "" });
export const emptyStore = (): StorePublic => ({
  name: emptyText(),
  description: emptyText(),
  logoMediaId: null,
  whatsappNumber: "",
  facebookUrl: "",
  currency: "EGP",
  defaultLanguage: "ar",
  branding: { primary: "#16A34A", accent: "#FF6B00" },
});
export const emptyProduct = (): ProductData => ({
  name: emptyText(),
  description: emptyText(),
  categoryId: "",
  slug: "",
  status: "draft",
  availability: "available",
  unitPriceMinor: null,
  boxPriceMinor: null,
  boxQuantity: null,
  cartonBoxQuantity: null,
  cartonPriceMinor: null,
  cartonQuantity: null,
  imageMediaIds: [],
  variants: [],
  discount: null,
});
export const emptyOffer = (): OfferData => ({
  type: "special",
  status: "draft",
  name: emptyText(),
  description: emptyText(),
  conditions: emptyText(),
  imageMediaId: null,
  startsAt: null,
  endsAt: null,
  featured: false,
  displayOrder: 0,
  placement: "none",
  bundleItems: [],
  bundleFinalPriceMinor: null,
  needsReview: false,
  productIds: [],
  specialDisplayPriceMinor: null,
  callout: emptyText(),
});
