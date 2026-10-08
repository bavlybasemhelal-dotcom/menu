import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, EyeOff, Eye, Search } from "lucide-react";
import { useUI } from "../../app/context";
import { useList } from "../../integrations/firebase/hooks";
import {
  removeContent,
  saveProduct,
  saveOffer,
  saveCategory,
  strip,
} from "../../integrations/firebase/repository";
import { localize, money, normalizeSearch } from "../products/logic";
import type { ProductData, OfferData, CategoryData } from "../products/models";
import { emptyText } from "../products/models";
import {
  Bilingual,
  Button,
  Confirm,
  Field,
  Loading,
  MediaImage,
  Notice,
  PageTitle,
  Panel,
  Pagination,
  useAction,
} from "../../components/ui";
import { MediaPicker } from "./Selectors";
export function ProductsList() {
  const { t, language, store } = useUI(),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [availability, setAvailability] = useState(""),
    [category, setCategory] = useState(""),
    [discount, setDiscount] = useState(false),
    categories = useList("categories", { admin: true }),
    list = useList("products", {
      admin: true,
      search: normalizeSearch(search),
      status,
      availability,
      category,
      discount,
    }),
    a = useAction();
  return (
    <>
      <PageTitle
        title={t("المنتجات", "Products")}
        subtitle={t(
          "أضف وعدّل وانشر منتجات محلك",
          "Add, edit and publish your products",
        )}
        action={
          <Link to="/admin/products/new" className="button">
            <Plus size={18} />
            {t("إضافة منتج", "Add product")}
          </Link>
        }
      />
      <div className="search-bar">
        <Search size={20} />
        <input
          aria-label={t("بحث المنتجات", "Search products")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("ابحث باسم المنتج…", "Search by product name…")}
        />
      </div>
      <Panel title={t("تصفية المنتجات", "Filter products")}>
        <div className="form-grid">
          <Field label={t("حالة النشر", "Publication status")}>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">{t("كل الحالات", "All statuses")}</option>
              <option value="published">{t("منشور", "Published")}</option>
              <option value="draft">{t("مسودة", "Draft")}</option>
              <option value="hidden">{t("مخفي", "Hidden")}</option>
            </select>
          </Field>
          <Field label={t("التوفر", "Availability")}>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
            >
              <option value="">{t("كل المنتجات", "All products")}</option>
              <option value="available">{t("متوفر", "Available")}</option>
              <option value="limited">{t("كمية محدودة", "Limited")}</option>
              <option value="unavailable">
                {t("غير متوفر", "Unavailable")}
              </option>
            </select>
          </Field>
          <Field label={t("القسم", "Category")}>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">{t("كل الأقسام", "All categories")}</option>
              {categories.data.map((c) => (
                <option key={c.id} value={c.id}>
                  {localize(c.name, language)}
                </option>
              ))}
            </select>
            {categories.error && <Notice error>{categories.error}</Notice>}
            <Pagination {...categories} />
          </Field>
          <label className="check-field">
            <input
              type="checkbox"
              checked={discount}
              onChange={(e) => setDiscount(e.target.checked)}
            />
            {t("منتجات عليها خصم فقط", "Discounted products only")}
          </label>
        </div>
      </Panel>
      {a.error && <Notice error>{a.error}</Notice>}
      <Panel>
        {list.error && <Notice error>{list.error}</Notice>}
        {list.loading ? (
          <Loading />
        ) : list.data.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("المنتج", "Product")}</th>
                  <th>{t("القطعة", "Unit")}</th>
                  <th>{t("العلبة", "Box")}</th>
                  <th>{t("الكرتونة", "Carton")}</th>
                  <th>{t("الحالة", "Status")}</th>
                  <th>{t("الإجراءات", "Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="table-product">
                        <MediaImage
                          id={p.imageMediaIds[0]}
                          alt={localize(p.name, language)}
                        />
                        {localize(p.name, language)}
                      </div>
                    </td>
                    <td>
                      {p.unitPriceMinor === null
                        ? "—"
                        : money(p.unitPriceMinor, store.currency, language)}
                    </td>
                    <td>
                      {p.boxPriceMinor == null
                        ? "—"
                        : money(p.boxPriceMinor, store.currency, language)}
                    </td>
                    <td>
                      {p.cartonPriceMinor === null
                        ? "—"
                        : money(p.cartonPriceMinor, store.currency, language)}
                    </td>
                    <td>
                      <span
                        className={
                          "badge " +
                          (p.status === "published" ? "" : "badge-muted")
                        }
                      >
                        {t(
                          p.status === "published"
                            ? "منشور"
                            : p.status === "hidden"
                              ? "مخفي"
                              : "مسودة",
                          p.status,
                        )}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link
                          aria-label={t("تعديل", "Edit")}
                          to={"/admin/products/" + p.id}
                        >
                          <Pencil size={16} />
                        </Link>
                        <Button
                          disabled={a.busy}
                          className="button-ghost"
                          aria-label={t("تغيير الظهور", "Toggle visibility")}
                          onClick={() =>
                            a.run(
                              () =>
                                saveProduct(
                                  {
                                    ...stripProduct(p),
                                    status:
                                      p.status === "published"
                                        ? "hidden"
                                        : "published",
                                  },
                                  p.id,
                                ),
                              "",
                            )
                          }
                        >
                          {p.status === "published" ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </Button>
                        <Confirm
                          title={t(
                            "حذف المنتج؟ الباقات المرتبطة ستحتاج مراجعة.",
                            "Delete product? Linked bundles will need review.",
                          )}
                          onConfirm={() => removeContent("products", p.id)}
                        >
                          <Button
                            className="button-ghost"
                            aria-label={t("حذف", "Delete")}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </Confirm>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Notice>
            {t("لا توجد منتجات في هذه الصفحة", "No products on this page")}
          </Notice>
        )}
        <Pagination {...list} />
      </Panel>
    </>
  );
}
export function OffersList({ banners = false }: { banners?: boolean }) {
  const { t, language, store } = useUI(),
    [status, setStatus] = useState(""),
    [type, setType] = useState(""),
    [placement, setPlacement] = useState(""),
    list = useList("offers", {
      admin: true,
      status,
      type,
      placement: placement || (banners ? "banner" : ""),
    }),
    a = useAction();
  return (
    <>
      <PageTitle
        title={
          banners
            ? t("البنرات", "Banners")
            : t("العروض والباقات", "Offers and bundles")
        }
        subtitle={t(
          "تفاصيل وأسعار مستقلة ومواعيد ظهور قابلة للتحكم",
          "Independent prices, content and scheduling",
        )}
        action={
          <Link
            className="button"
            to={"/admin/offers/new" + (banners ? "?banner=1" : "")}
          >
            <Plus size={18} />
            {t("إضافة", "Add")}
          </Link>
        }
      />
      <Panel title={t("تصفية العروض", "Filter offers")}>
        <div className="form-grid">
          <Field label={t("حالة النشر", "Publication status")}>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">{t("كل الحالات", "All statuses")}</option>
              <option value="published">{t("منشور", "Published")}</option>
              <option value="draft">{t("مسودة", "Draft")}</option>
              <option value="hidden">{t("مخفي", "Hidden")}</option>
            </select>
          </Field>
          <Field label={t("نوع العرض", "Offer type")}>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="">{t("كل الأنواع", "All types")}</option>
              <option value="special">{t("عرض خاص", "Special")}</option>
              <option value="bundle">{t("باقة", "Bundle")}</option>
            </select>
          </Field>
          <Field label={t("مكان العرض", "Placement")}>
            <select
              value={placement}
              onChange={(e) => setPlacement(e.target.value)}
            >
              <option value="">
                {banners
                  ? t("كل البنرات", "All banners")
                  : t("كل الأماكن", "All placements")}
              </option>
              <option value="hero">{t("البنر الرئيسي", "Hero banner")}</option>
              <option value="strip">{t("شريط العرض", "Offer strip")}</option>
              {!banners && (
                <option value="none">
                  {t("صفحة العروض فقط", "Offers page only")}
                </option>
              )}
            </select>
          </Field>
        </div>
      </Panel>
      {a.error && <Notice error>{a.error}</Notice>}
      <Panel>
        {list.error && <Notice error>{list.error}</Notice>}
        {list.loading ? (
          <Loading />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("الاسم", "Name")}</th>
                  <th>{t("نوع العرض", "Type")}</th>
                  <th>{t("السعر", "Price")}</th>
                  <th>{t("الحالة", "Status")}</th>
                  <th>{t("الإجراءات", "Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((o) => (
                  <tr key={o.id}>
                    <td>{localize(o.name, language)}</td>
                    <td>
                      {o.type === "bundle"
                        ? t("باقة", "Bundle")
                        : t("خاص", "Special")}{" "}
                      · {o.placement}
                    </td>
                    <td>
                      {(o.type === "bundle"
                        ? o.bundleFinalPriceMinor
                        : o.specialDisplayPriceMinor) === null
                        ? "—"
                        : money(
                            (o.type === "bundle"
                              ? o.bundleFinalPriceMinor
                              : o.specialDisplayPriceMinor)!,
                            store.currency,
                            language,
                          )}
                    </td>
                    <td>
                      <span
                        className={
                          "badge " + (o.needsReview ? "badge-warning" : "")
                        }
                      >
                        {o.needsReview
                          ? t("يحتاج مراجعة", "Needs review")
                          : t(
                              o.status === "published"
                                ? "منشور"
                                : o.status === "hidden"
                                  ? "مخفي"
                                  : "مسودة",
                              o.status,
                            )}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <Link
                          to={"/admin/offers/" + o.id}
                          aria-label={t("تعديل", "Edit")}
                        >
                          <Pencil size={16} />
                        </Link>
                        <Button
                          className="button-ghost"
                          disabled={a.busy || o.needsReview}
                          aria-label={t("تغيير الظهور", "Toggle visibility")}
                          onClick={() =>
                            a.run(
                              () =>
                                saveOffer(
                                  {
                                    ...stripOffer(o),
                                    status:
                                      o.status === "published"
                                        ? "hidden"
                                        : "published",
                                  },
                                  o.id,
                                ),
                              "",
                            )
                          }
                        >
                          {o.status === "published" ? (
                            <EyeOff size={16} />
                          ) : (
                            <Eye size={16} />
                          )}
                        </Button>
                        <Confirm
                          title={t("حذف العرض؟", "Delete offer?")}
                          onConfirm={() => removeContent("offers", o.id)}
                        >
                          <Button
                            className="button-ghost"
                            aria-label={t("حذف", "Delete")}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </Confirm>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination {...list} />
      </Panel>
    </>
  );
}
export function stripProduct(p: Record<string, unknown>) {
  const { searchTokens: _tokens, discountEligible: _flag, ...data } = strip(p);
  void _tokens;
  void _flag;
  return data as ProductData;
}
export function stripOffer(p: Record<string, unknown>) {
  const { bundleProductIds: _ids, ...data } = strip(p);
  void _ids;
  return data as OfferData;
}
export function Categories() {
  const { t, language } = useUI(),
    list = useList("categories", { admin: true }),
    [id, setId] = useState<string | undefined>(),
    [editing, setEditing] = useState(false),
    [value, setValue] = useState<CategoryData>({
      name: emptyText(),
      description: emptyText(),
      order: 0,
      status: "published",
      coverMediaId: null,
    }),
    a = useAction();
  return (
    <>
      <PageTitle
        title={t("الأقسام", "Categories")}
        subtitle={t(
          "رتّب الأقسام بالشكل المناسب لنشاطك",
          "Arrange categories for your business",
        )}
        action={
          <Button
            onClick={() => {
              setId(undefined);
              setValue({
                name: emptyText(),
                description: emptyText(),
                order: 0,
                status: "published",
                coverMediaId: null,
              });
              setEditing(true);
            }}
          >
            <Plus size={18} />
            {t("قسم جديد", "New category")}
          </Button>
        }
      />
      {a.error && <Notice error>{a.error}</Notice>}
      {a.success && <Notice>{a.success}</Notice>}
      {editing && (
        <Panel title={t("بيانات القسم", "Category details")}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void a.run(
                async () => {
                  await saveCategory(value, id);
                  setEditing(false);
                },
                t("تم حفظ القسم", "Category saved"),
              );
            }}
          >
            <Bilingual
              label={t("اسم القسم", "Category name")}
              value={value.name}
              onChange={(v) => setValue({ ...value, name: v })}
            />
            <Bilingual
              multiline
              label={t("الوصف", "Description")}
              value={value.description}
              onChange={(v) => setValue({ ...value, description: v })}
            />
            <div className="form-grid">
              <Field label={t("الترتيب", "Order")}>
                <input
                  type="number"
                  min={0}
                  max={100000}
                  value={value.order}
                  onChange={(e) =>
                    setValue({ ...value, order: Number(e.target.value) })
                  }
                />
              </Field>
              <Field label={t("الظهور", "Visibility")}>
                <select
                  value={value.status}
                  onChange={(e) =>
                    setValue({
                      ...value,
                      status: e.target.value as CategoryData["status"],
                    })
                  }
                >
                  <option value="published">{t("ظاهر", "Published")}</option>
                  <option value="hidden">{t("مخفي", "Hidden")}</option>
                </select>
              </Field>
            </div>
            <Field label={t("صورة القسم", "Category image")}>
              <MediaPicker
                max={1}
                value={value.coverMediaId ? [value.coverMediaId] : []}
                onChange={(v) =>
                  setValue({ ...value, coverMediaId: v[0] || null })
                }
              />
            </Field>
            <div className="button-row">
              <Button disabled={a.busy}>
                {t("حفظ القسم", "Save category")}
              </Button>
              <Button
                type="button"
                className="button-ghost"
                onClick={() => setEditing(false)}
              >
                {t("إلغاء", "Cancel")}
              </Button>
            </div>
          </form>
        </Panel>
      )}
      <Panel>
        {list.error && <Notice error>{list.error}</Notice>}
        {list.loading ? (
          <Loading />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("القسم", "Category")}</th>
                  <th>{t("الترتيب", "Order")}</th>
                  <th>{t("الحالة", "Status")}</th>
                  <th>{t("الإجراءات", "Actions")}</th>
                </tr>
              </thead>
              <tbody>
                {list.data.map((c) => (
                  <tr key={c.id}>
                    <td>{localize(c.name, language)}</td>
                    <td>{c.order}</td>
                    <td>
                      {t(c.status === "published" ? "ظاهر" : "مخفي", c.status)}
                    </td>
                    <td>
                      <div className="table-actions">
                        <Button
                          className="button-ghost"
                          aria-label={t("تعديل", "Edit")}
                          onClick={() => {
                            setId(c.id);
                            setValue(strip(c) as CategoryData);
                            setEditing(true);
                          }}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Confirm
                          title={t(
                            "حذف القسم؟ يلزم نقل منتجاته أولاً.",
                            "Delete category? Move its products first.",
                          )}
                          onConfirm={() => removeContent("categories", c.id)}
                        >
                          <Button
                            className="button-ghost"
                            aria-label={t("حذف", "Delete")}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </Confirm>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination {...list} />
      </Panel>
    </>
  );
}
