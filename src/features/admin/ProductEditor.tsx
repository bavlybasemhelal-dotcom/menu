import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Plus, Save, Trash2 } from "lucide-react";
import { useUI } from "../../app/context";
import { useDocument, useList } from "../../integrations/firebase/hooks";
import { shopId } from "../../integrations/firebase/client";
import { saveProduct } from "../../integrations/firebase/repository";
import {
  emptyProduct,
  emptyText,
  type ProductData,
  type Product,
} from "../products/models";
import { localize, minorUnits } from "../products/logic";
import {
  Bilingual,
  Button,
  Field,
  Notice,
  Panel,
  PageTitle,
  useAction,
  Loading,
  Pagination,
} from "../../components/ui";
import ImageField, { useImageWork } from "./ImageField";
import { stripProduct } from "./ContentLists";
import { ProductCard } from "../catalog/Cards";
export function MoneyField({
  label,
  value,
  onChange,
  optional = false,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  optional?: boolean;
}) {
  const [text, setText] = useState(value === null ? "" : String(value / 100));
  useEffect(() => setText(value === null ? "" : String(value / 100)), [value]);
  return (
    <Field label={label}>
      <input
        inputMode="decimal"
        value={text}
        onChange={(e) => {
          const v = e.target.value;
          setText(v);
          try {
            if (v === "") {
              if (optional) onChange(null);
              e.currentTarget.setCustomValidity("");
            } else {
              onChange(minorUnits(v));
              e.currentTarget.setCustomValidity("");
            }
          } catch {
            e.currentTarget.setCustomValidity(
              "استخدم مبلغًا صحيحًا بمنزلتين عشريتين / Use a valid amount with up to 2 decimals",
            );
          }
        }}
        onBlur={(e) => {
          if (e.currentTarget.validity.valid)
            setText(value === null ? "" : String(value / 100));
        }}
        required={!optional}
      />
    </Field>
  );
}
export function ScheduleFields({
  startsAt,
  endsAt,
  onChange,
}: {
  startsAt: number | null;
  endsAt: number | null;
  onChange: (v: { startsAt: number | null; endsAt: number | null }) => void;
}) {
  const { t } = useUI();
  const asInput = (v: number | null) =>
    v === null
      ? ""
      : new Date(v - new Date(v).getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
  return (
    <div className="form-grid">
      <Field label={t("بداية العرض (اختياري)", "Starts at (optional)")}>
        <input
          type="datetime-local"
          value={asInput(startsAt)}
          onChange={(e) =>
            onChange({
              startsAt: e.target.value
                ? new Date(e.target.value).getTime()
                : null,
              endsAt,
            })
          }
        />
      </Field>
      <Field label={t("نهاية العرض (اختياري)", "Ends at (optional)")}>
        <input
          type="datetime-local"
          value={asInput(endsAt)}
          onChange={(e) =>
            onChange({
              startsAt,
              endsAt: e.target.value
                ? new Date(e.target.value).getTime()
                : null,
            })
          }
        />
      </Field>
    </div>
  );
}
export default function ProductEditor() {
  const { id } = useParams(),
    navigate = useNavigate(),
    { t, language } = useUI(),
    loaded = useDocument<Product>(
      id ? "shops/" + shopId + "/products/" + id : null,
    ),
    categories = useList("categories", { admin: true, pageSize: 24 }),
    [value, setValue] = useState<ProductData>(emptyProduct),
    {
      busy: imageBusy,
      set: setImageBusy,
      isBusy: isImageBusy,
    } = useImageWork(),
    a = useAction();
  useEffect(() => {
    if (loaded.data) setValue(stripProduct(loaded.data));
    else if (!id) setValue(emptyProduct());
  }, [loaded.data, id]);
  function patch<K extends keyof ProductData>(key: K, v: ProductData[K]) {
    setValue((old) => ({ ...old, [key]: v }));
  }
  if (id && loaded.loading) return <Loading />;
  if (id && !loaded.data)
    return (
      <Notice error>
        {loaded.error || t("المنتج غير موجود", "Product not found")}
      </Notice>
    );
  return (
    <>
      <PageTitle
        title={
          id
            ? t("تعديل المنتج", "Edit product")
            : t("إضافة منتج جديد", "Add a product")
        }
        subtitle={t(
          "تفاصيل واضحة، أسعار دقيقة، وصورة تليق بمنتجك",
          "Clear details, accurate prices and beautiful media",
        )}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (isImageBusy()) return;
          void a.run(
            async () => {
              const newId = await saveProduct(value, id);
              if (!id) navigate("/admin/products/" + newId);
            },
            t("تم حفظ المنتج", "Product saved"),
          );
        }}
      >
        <div className="form-columns">
          <div>
            <Panel title={t("١ · بيانات المنتج", "1 · Product details")}>
              <Bilingual
                label={t("اسم المنتج", "Product name")}
                value={value.name}
                onChange={(v) => patch("name", v)}
              />
              <Bilingual
                multiline
                label={t("وصف المنتج", "Product description")}
                value={value.description}
                onChange={(v) => patch("description", v)}
              />
              <div className="form-grid">
                <Field label={t("القسم", "Category")}>
                  <select
                    required
                    value={value.categoryId}
                    onChange={(e) => patch("categoryId", e.target.value)}
                  >
                    <option value="">
                      {t("اختيار القسم", "Choose category")}
                    </option>
                    {categories.data.map((c) => (
                      <option value={c.id} key={c.id}>
                        {localize(c.name, language)} · {c.status}
                      </option>
                    ))}
                  </select>
                  <Pagination {...categories} />
                  <Link to="/admin/categories" className="text-button">
                    {t("إدارة الأقسام", "Manage categories")}
                  </Link>
                </Field>
                <Field label={t("حالة التوفر", "Availability")}>
                  <select
                    value={value.availability}
                    onChange={(e) =>
                      patch(
                        "availability",
                        e.target.value as ProductData["availability"],
                      )
                    }
                  >
                    <option value="available">{t("متوفر", "Available")}</option>
                    <option value="limited">
                      {t("كمية محدودة", "Limited")}
                    </option>
                    <option value="unavailable">
                      {t("غير متوفر", "Unavailable")}
                    </option>
                  </select>
                </Field>
              </div>
            </Panel>
            <Panel title={t("٢ · الصور والوسائط", "2 · Images and media")}>
              <ImageField
                folder="products"
                label={t("رفع صور المنتج", "Upload product images")}
                onBusyChange={setImageBusy}
                value={value.imageMediaIds}
                onChange={(v) => patch("imageMediaIds", v)}
              />
            </Panel>
            <Panel title={t("٣ · الأسعار والخصم", "3 · Prices and discount")}>
              <div className="form-grid">
                <MoneyField
                  optional
                  label={t("سعر القطعة", "Unit price")}
                  value={value.unitPriceMinor}
                  onChange={(v) => patch("unitPriceMinor", v)}
                />
                <MoneyField
                  optional
                  label={t("سعر العلبة (اختياري)", "Box price (optional)")}
                  value={value.boxPriceMinor}
                  onChange={(v) => patch("boxPriceMinor", v)}
                />
                <Field label={t("عدد القطع داخل العلبة", "Pieces per box")}>
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    value={value.boxQuantity ?? ""}
                    onChange={(e) =>
                      patch(
                        "boxQuantity",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  />
                </Field>
                <Field label={t("عدد العلب داخل الكرتونة", "Boxes per carton")}>
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    value={value.cartonBoxQuantity ?? ""}
                    onChange={(e) =>
                      patch(
                        "cartonBoxQuantity",
                        e.target.value ? Number(e.target.value) : null,
                      )
                    }
                  />
                </Field>
                <MoneyField
                  optional
                  label={t("سعر الكرتونة (اختياري)", "Carton price (optional)")}
                  value={value.cartonPriceMinor}
                  onChange={(v) => patch("cartonPriceMinor", v)}
                />
                <Notice>
                  {t(
                    "الكرتونة تحتوي علبًا، والعلبة تحتوي قطعًا. اترك سعر أي مستوى فارغًا لإخفائه؛ يلزم سعر واحد على الأقل، والأسعار مستقلة.",
                    "Cartons contain boxes, and boxes contain pieces. Leave a level price blank to hide it; at least one price is required, and prices are independent.",
                  )}
                  {value.boxQuantity && value.cartonBoxQuantity
                    ? " · " +
                      value.boxQuantity * value.cartonBoxQuantity +
                      " " +
                      t("قطعة / كرتونة", "pieces / carton")
                    : ""}
                </Notice>
              </div>
              <label className="check-field">
                <input
                  type="checkbox"
                  checked={!!value.discount}
                  onChange={(e) =>
                    patch(
                      "discount",
                      e.target.checked
                        ? {
                            kind: "percent",
                            value: 0,
                            target:
                              value.unitPriceMinor !== null
                                ? "unit"
                                : value.boxPriceMinor !== null
                                  ? "box"
                                  : "carton",
                            startsAt: null,
                            endsAt: null,
                          }
                        : null,
                    )
                  }
                />
                {t(
                  "خصم إضافي — يظهر تلقائيًا في العروض عند سريانه",
                  "Extra discount — appears in Offers while active",
                )}
              </label>
              {value.discount && (
                <>
                  <div className="form-grid">
                    <Field label={t("نوع الخصم", "Discount type")}>
                      <select
                        value={value.discount.kind}
                        onChange={(e) =>
                          patch("discount", {
                            ...value.discount!,
                            kind: e.target.value as "percent" | "fixed",
                            value: 0,
                          })
                        }
                      >
                        <option value="percent">
                          {t("نسبة مئوية", "Percentage")}
                        </option>
                        <option value="fixed">
                          {t("مبلغ ثابت", "Fixed amount")}
                        </option>
                      </select>
                    </Field>
                    {value.discount.kind === "fixed" ? (
                      <MoneyField
                        label={t("قيمة الخصم", "Discount amount")}
                        value={value.discount.value}
                        onChange={(v) =>
                          patch("discount", {
                            ...value.discount!,
                            value: v || 0,
                          })
                        }
                      />
                    ) : (
                      <Field label={t("نسبة الخصم ٪", "Discount %")}>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          step=".1"
                          value={value.discount.value}
                          onChange={(e) =>
                            patch("discount", {
                              ...value.discount!,
                              value: Number(e.target.value),
                            })
                          }
                        />
                      </Field>
                    )}
                    <Field label={t("تطبيق الخصم على", "Discount applies to")}>
                      <select
                        value={value.discount.target}
                        onChange={(e) =>
                          patch("discount", {
                            ...value.discount!,
                            target: e.target.value as
                              "unit" | "box" | "carton" | "both" | "all",
                          })
                        }
                      >
                        <option value="unit">{t("القطعة", "Unit")}</option>
                        <option value="box">{t("العلبة", "Box")}</option>
                        <option value="carton">
                          {t("الكرتونة", "Carton")}
                        </option>
                        <option value="both">
                          {t("القطعة والكرتونة", "Piece and carton")}
                        </option>
                        <option value="all">
                          {t(
                            "كل مستويات البيع المتاحة",
                            "All available selling units",
                          )}
                        </option>
                      </select>
                    </Field>
                  </div>
                  <ScheduleFields
                    {...value.discount}
                    onChange={(v) =>
                      patch("discount", { ...value.discount!, ...v })
                    }
                  />
                </>
              )}
            </Panel>
            <Panel
              title={t(
                "٤ · المقاسات والألوان والخيارات",
                "4 · Sizes, colors and options",
              )}
            >
              {value.variants.map((v, index) => (
                <div className="variant-row" key={v.id}>
                  <Bilingual
                    label={t("اسم الخيار", "Option label")}
                    value={v.label}
                    onChange={(label) =>
                      patch(
                        "variants",
                        value.variants.map((x, i) =>
                          i === index ? { ...x, label } : x,
                        ),
                      )
                    }
                  />
                  <div className="form-grid">
                    <Field label={t("نوع الخيار", "Option type")}>
                      <select
                        value={v.kind}
                        onChange={(e) =>
                          patch(
                            "variants",
                            value.variants.map((x, i) =>
                              i === index
                                ? {
                                    ...x,
                                    kind: e.target.value as typeof v.kind,
                                  }
                                : x,
                            ),
                          )
                        }
                      >
                        <option value="size">{t("مقاس", "Size")}</option>
                        <option value="color">{t("لون", "Color")}</option>
                        <option value="option">{t("خيار", "Option")}</option>
                      </select>
                    </Field>
                    <MoneyField
                      optional
                      label={t(
                        "سعر خاص للخيار (اختياري)",
                        "Option price (optional)",
                      )}
                      value={v.unitPriceMinor}
                      onChange={(price) =>
                        patch(
                          "variants",
                          value.variants.map((x, i) =>
                            i === index ? { ...x, unitPriceMinor: price } : x,
                          ),
                        )
                      }
                    />
                  </div>
                  <label className="check-field">
                    <input
                      type="checkbox"
                      checked={v.available}
                      onChange={(e) =>
                        patch(
                          "variants",
                          value.variants.map((x, i) =>
                            i === index
                              ? { ...x, available: e.target.checked }
                              : x,
                          ),
                        )
                      }
                    />
                    {t("متوفر", "Available")}
                  </label>
                  <Button
                    type="button"
                    className="button-ghost"
                    onClick={() =>
                      patch(
                        "variants",
                        value.variants.filter((_, i) => i !== index),
                      )
                    }
                  >
                    <Trash2 size={16} />
                    {t("إزالة الخيار", "Remove option")}
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                className="button-ghost"
                disabled={value.variants.length >= 12}
                onClick={() =>
                  patch("variants", [
                    ...value.variants,
                    {
                      id: crypto.randomUUID(),
                      label: emptyText(),
                      kind: "option",
                      unitPriceMinor: null,
                      available: true,
                    },
                  ])
                }
              >
                <Plus size={16} />
                {t("إضافة خيار", "Add option")}
              </Button>
            </Panel>
            <Panel title={t("٥ · النشر", "5 · Publishing")}>
              <Field label={t("حالة المنتج", "Product status")}>
                <select
                  value={value.status}
                  onChange={(e) =>
                    patch("status", e.target.value as ProductData["status"])
                  }
                >
                  <option value="draft">{t("مسودة", "Draft")}</option>
                  <option value="published">{t("منشور", "Published")}</option>
                  <option value="hidden">{t("مخفي", "Hidden")}</option>
                </select>
              </Field>
              <Notice>
                {t(
                  "تعديل منتج مرتبط بباقة يخفي الباقة حتى مراجعتها، وسعر الباقة مستقل عن الخصومات.",
                  "Editing a bundle member hides the bundle pending review. Bundle price is independent of discounts.",
                )}
              </Notice>
            </Panel>
          </div>
          <aside className="preview-sidebar">
            <Panel title={t("معاينة مباشرة", "Live preview")}>
              <ProductCard product={value} preview />
              <p className="scroll-note">
                {t(
                  "المعاينة ليست نشرًا للزوار",
                  "Preview does not publish to visitors",
                )}
              </p>
            </Panel>
          </aside>
        </div>
        {a.error && <Notice error>{a.error}</Notice>}
        {a.success && <Notice>{a.success}</Notice>}
        <div className="save-bar">
          <Link to="/admin/products" className="button button-ghost">
            {t("الرجوع", "Back")}
          </Link>
          <Button disabled={a.busy || imageBusy}>
            <Save size={18} />
            {a.busy
              ? t("جارٍ الحفظ…", "Saving…")
              : t("حفظ المنتج", "Save product")}
          </Button>
        </div>
      </form>
    </>
  );
}
