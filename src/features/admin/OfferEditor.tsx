import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { Save, Trash2 } from "lucide-react";
import { useUI } from "../../app/context";
import { useDocument } from "../../integrations/firebase/hooks";
import { shopId } from "../../integrations/firebase/client";
import { saveOffer } from "../../integrations/firebase/repository";
import { emptyOffer, type OfferData, type Offer } from "../products/models";
import {
  Bilingual,
  Button,
  Field,
  Loading,
  Notice,
  PageTitle,
  Panel,
  useAction,
} from "../../components/ui";
import { ProductPicker, ProductLabel } from "./Selectors";
import ImageField, { useImageWork } from "./ImageField";
import { MoneyField, ScheduleFields } from "./ProductEditor";
import { stripOffer } from "./ContentLists";
export default function OfferEditor() {
  const { id } = useParams(),
    [params] = useSearchParams(),
    nav = useNavigate(),
    { t } = useUI(),
    loaded = useDocument<Offer>(
      id ? "shops/" + shopId + "/offers/" + id : null,
    ),
    [value, set] = useState<OfferData>(() => ({
      ...emptyOffer(),
      placement: params.has("banner") ? "hero" : "none",
    })),
    {
      busy: imageBusy,
      set: setImageBusy,
      isBusy: isImageBusy,
    } = useImageWork(),
    a = useAction();
  useEffect(() => {
    if (loaded.data) set(stripOffer(loaded.data));
  }, [loaded.data]);
  function patch<K extends keyof OfferData>(key: K, v: OfferData[K]) {
    set((old) => ({ ...old, [key]: v }));
  }
  if (id && loaded.loading) return <Loading />;
  if (id && !loaded.data)
    return (
      <Notice error>
        {loaded.error || t("العرض غير موجود", "Offer not found")}
      </Notice>
    );
  return (
    <>
      <PageTitle
        title={
          id
            ? t("تعديل العرض", "Edit offer")
            : t("إضافة عرض جديد", "Create offer")
        }
        subtitle={t(
          "عرض خاص أو باقة بسعر نهائي مستقل",
          "A special offer or a bundle with an independent final price",
        )}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isImageBusy()) return;
          void a.run(
            async () => {
              const newId = await saveOffer(value, id);
              if (!id) nav("/admin/offers/" + newId);
            },
            t("تم حفظ العرض", "Offer saved"),
          );
        }}
      >
        <Panel title={t("١ · تفاصيل العرض", "1 · Offer details")}>
          <div className="form-grid">
            <Field label={t("نوع العرض", "Offer type")}>
              <select
                value={value.type}
                onChange={(e) =>
                  patch("type", e.target.value as OfferData["type"])
                }
              >
                <option value="special">{t("عرض خاص", "Special offer")}</option>
                <option value="bundle">
                  {t("باقة منتجات", "Product bundle")}
                </option>
              </select>
            </Field>
            <Field label={t("حالة النشر", "Publishing status")}>
              <select
                value={value.status}
                onChange={(e) =>
                  patch("status", e.target.value as OfferData["status"])
                }
              >
                <option value="draft">{t("مسودة", "Draft")}</option>
                <option value="published">{t("منشور", "Published")}</option>
                <option value="hidden">{t("مخفي", "Hidden")}</option>
              </select>
            </Field>
          </div>
          <Bilingual
            label={t("اسم العرض", "Offer name")}
            value={value.name}
            onChange={(v) => patch("name", v)}
          />
          <Bilingual
            multiline
            label={t("تفاصيل العرض", "Offer description")}
            value={value.description}
            onChange={(v) => patch("description", v)}
          />
          <Bilingual
            multiline
            label={t("الشروط", "Conditions")}
            value={value.conditions}
            onChange={(v) => patch("conditions", v)}
          />
          <Bilingual
            label={t("عبارة مميزة", "Callout")}
            value={value.callout}
            onChange={(v) => patch("callout", v)}
          />
        </Panel>
        <Panel title={t("٢ · المحتوى والسعر", "2 · Content and price")}>
          {value.type === "bundle" ? (
            <>
              <Notice>
                {t(
                  "سعر الباقة نهائي. خصومات المنتجات لا تُجمع عليه. الحد ٦ عناصر لكل باقة.",
                  "Bundle price is final; product discounts are not applied again. Up to 6 items per bundle.",
                )}
              </Notice>
              {value.bundleItems.map((item, i) => (
                <div className="bundle-row" key={i}>
                  <h3>
                    <ProductLabel id={item.productId} />
                  </h3>
                  <div className="form-grid">
                    <Field label={t("الكمية", "Quantity")}>
                      <input
                        type="number"
                        min={1}
                        max={100000}
                        value={item.quantity}
                        onChange={(e) =>
                          patch(
                            "bundleItems",
                            value.bundleItems.map((v, n) =>
                              n === i
                                ? { ...v, quantity: Number(e.target.value) }
                                : v,
                            ),
                          )
                        }
                      />
                    </Field>
                    <Field label={t("الوحدة", "Unit")}>
                      <select
                        value={item.unit}
                        onChange={(e) =>
                          patch(
                            "bundleItems",
                            value.bundleItems.map((v, n) =>
                              n === i
                                ? {
                                    ...v,
                                    unit: e.target.value as
                                      "unit" | "box" | "carton",
                                  }
                                : v,
                            ),
                          )
                        }
                      >
                        <option value="unit">{t("قطعة", "Unit")}</option>
                        <option value="box">{t("علبة", "Box")}</option>
                        <option value="carton">{t("كرتونة", "Carton")}</option>
                      </select>
                    </Field>
                  </div>
                  <Button
                    type="button"
                    className="button-ghost"
                    onClick={() =>
                      patch(
                        "bundleItems",
                        value.bundleItems.filter((_, n) => n !== i),
                      )
                    }
                  >
                    <Trash2 size={16} />
                    {t("إزالة", "Remove")}
                  </Button>
                </div>
              ))}
              {value.bundleItems.length < 6 && (
                <ProductPicker
                  onPick={(id) =>
                    patch("bundleItems", [
                      ...value.bundleItems,
                      { productId: id, quantity: 1, unit: "unit" },
                    ])
                  }
                />
              )}
              <MoneyField
                label={t("السعر النهائي للباقة", "Final bundle price")}
                value={value.bundleFinalPriceMinor}
                onChange={(v) => patch("bundleFinalPriceMinor", v)}
              />
              {(value.needsReview || loaded.data?.needsReview) && (
                <>
                  <Notice error>
                    {t(
                      "تغيّر منتج مرتبط بهذه الباقة. راجع العناصر والأسعار قبل إعادة النشر.",
                      "A bundle member changed. Review items and price before republishing.",
                    )}
                  </Notice>
                  <label className="check-field">
                    <input
                      type="checkbox"
                      checked={!value.needsReview}
                      onChange={(e) => patch("needsReview", !e.target.checked)}
                    />
                    {t("راجعت تفاصيل الباقة", "I reviewed the bundle")}
                  </label>
                </>
              )}
            </>
          ) : (
            <>
              <MoneyField
                optional
                label={t("سعر العرض (اختياري)", "Offer price (optional)")}
                value={value.specialDisplayPriceMinor}
                onChange={(v) => patch("specialDisplayPriceMinor", v)}
              />
              {value.productIds.map((id) => (
                <div className="button-row" key={id}>
                  <ProductLabel id={id} />
                  <Button
                    type="button"
                    className="button-ghost"
                    onClick={() =>
                      patch(
                        "productIds",
                        value.productIds.filter((v) => v !== id),
                      )
                    }
                  >
                    {t("إزالة", "Remove")}
                  </Button>
                </div>
              ))}
              {value.productIds.length < 6 && (
                <ProductPicker
                  onPick={(id) =>
                    patch("productIds", [...new Set([...value.productIds, id])])
                  }
                />
              )}
            </>
          )}
        </Panel>
        <Panel title={t("٣ · الصورة ومكان الظهور", "3 · Image and placement")}>
          <ImageField
            folder="offers"
            label={t("رفع صورة العرض أو البنر", "Upload offer or banner image")}
            onBusyChange={setImageBusy}
            max={1}
            value={value.imageMediaId ? [value.imageMediaId] : []}
            onChange={(v) => patch("imageMediaId", v[0] || null)}
          />
          <div className="form-grid">
            <Field label={t("مكان البنر", "Banner placement")}>
              <select
                value={value.placement}
                onChange={(e) =>
                  patch("placement", e.target.value as OfferData["placement"])
                }
              >
                <option value="none">
                  {t("في صفحة العروض فقط", "Offers page only")}
                </option>
                <option value="hero">{t("بنر رئيسي", "Hero banner")}</option>
                <option value="strip">
                  {t("شريط عرض", "Promotion strip")}
                </option>
              </select>
            </Field>
            <Field label={t("ترتيب الظهور", "Display order")}>
              <input
                type="number"
                min={0}
                max={100000}
                value={value.displayOrder}
                onChange={(e) => patch("displayOrder", Number(e.target.value))}
              />
            </Field>
          </div>
          <label className="check-field">
            <input
              type="checkbox"
              checked={value.featured}
              onChange={(e) => patch("featured", e.target.checked)}
            />
            {t("عرض مميز", "Featured offer")}
          </label>
        </Panel>
        <Panel title={t("٤ · المواعيد", "4 · Schedule")}>
          <ScheduleFields
            {...value}
            onChange={(v) => set({ ...value, ...v })}
          />
        </Panel>
        {a.error && <Notice error>{a.error}</Notice>}
        {a.success && <Notice>{a.success}</Notice>}
        <div className="save-bar">
          <Link to="/admin/offers" className="button button-ghost">
            {t("الرجوع", "Back")}
          </Link>
          <Button disabled={a.busy || imageBusy}>
            <Save size={18} />
            {t("حفظ العرض", "Save offer")}
          </Button>
        </div>
      </form>
    </>
  );
}
