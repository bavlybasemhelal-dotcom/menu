import { useEffect, useState } from "react";
import {
  getCountFromServer,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  type QuerySnapshot,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import {
  Package,
  Layers,
  Tags,
  Images,
  Plus,
  FolderSync,
  Settings,
  Sparkles,
} from "lucide-react";
import { useUI } from "../../app/context";
import { items } from "../../integrations/firebase/repository";
import { useList, useDocument } from "../../integrations/firebase/hooks";
import { shopId } from "../../integrations/firebase/client";
import type { PrivateConfig } from "../products/models";
import { normalizeConfig } from "../../integrations/drive/config";
import { localize, formatMoney, inSchedule } from "../products/logic";
import { decode } from "../../integrations/firebase/codec";
async function activeOfferCount() {
  let cursor: QueryDocumentSnapshot | null = null,
    count = 0;
  for (;;) {
    const page: QuerySnapshot<DocumentData> = await getDocs(
      query(
        items("offers"),
        where("status", "==", "published"),
        where("needsReview", "==", false),
        orderBy("displayOrder"),
        ...(cursor ? [startAfter(cursor)] : []),
        limit(50),
      ),
    );
    count += page.docs.filter((d) =>
      inSchedule(
        decode(d.data()) as { startsAt: number | null; endsAt: number | null },
      ),
    ).length;
    if (page.size < 50) return count;
    cursor = page.docs.at(-1)!;
  }
}
import {
  PageTitle,
  Panel,
  Notice,
  MediaImage,
  Loading,
} from "../../components/ui";
export default function Dashboard() {
  const { t, store, language } = useUI(),
    [counts, setCounts] = useState<Record<string, number> | null>(null),
    [error, setError] = useState(""),
    latest = useList("products", { admin: true, pageSize: 5 });
  const drive = normalizeConfig(
    useDocument<PrivateConfig>("privateShopConfig/" + shopId).data,
  );
  useEffect(() => {
    let active = true;
    Promise.all(
      ["products", "categories", "offers", "media"].map(
        async (c) =>
          [
            c,
            c === "offers"
              ? await activeOfferCount()
              : (
                  await getCountFromServer(
                    c === "media"
                      ? items("media")
                      : query(
                          items(c as "products"),
                          where("status", "==", "published"),
                        ),
                  )
                ).data().count,
          ] as const,
      ),
    )
      .then((v) => {
        if (active) setCounts(Object.fromEntries(v));
      })
      .catch(() => {
        if (active)
          setError(t("تعذر تحميل الإحصاءات", "Unable to load counts"));
      });
    return () => {
      active = false;
    };
  }, [t]);
  const stats = [
    ["products", "منتجات منشورة", "Published products", Package],
    ["categories", "الأقسام", "Categories", Layers],
    ["offers", "عروض سارية", "Active offers", Tags],
    ["media", "الوسائط", "Media", Images],
  ] as const;
  return (
    <>
      <PageTitle
        title={t("لوحة الإدارة", "Dashboard")}
        subtitle={t("كل تفاصيل محلك تحت إيدك", "Your store, at a glance")}
        action={
          <Link className="button" to="/admin/products/new">
            <Plus size={17} />
            {t("منتج جديد", "New product")}
          </Link>
        }
      />
      <div className="hero dashboard-welcome">
        <div>
          <div className="eyebrow">
            <Sparkles size={18} />
            {t("أهلاً بعودتك", "Welcome back")}
          </div>
          <h2>
            {localize(store.name, language) ||
              t("جهّز هوية محلك", "Set up your store identity")}
          </h2>
          <p>
            {t(
              "أضف المنتجات، رتّب الأقسام، وخلّي عروضك تظهر لزوارك في لحظتها.",
              "Add products, arrange categories and publish offers instantly.",
            )}
          </p>
        </div>
      </div>
      {error && <Notice error>{error}</Notice>}
      <Notice>
        {drive.scriptConnected
          ? t(
              "آخر اختبار ربط Apps Script ناجح",
              "Last Apps Script connection test passed",
            )
          : t(
              "ربط Apps Script يحتاج إعدادًا واختبارًا",
              "Apps Script needs setup and testing",
            )}{" "}
        ·{" "}
        <Link to="/admin/products">
          {t(
            "ارفع الصور واختبر عرضها مباشرة من محرر المنتج أو الشعار أو القسم أو العرض.",
            "Upload and verify images directly in the product, logo, category or offer editor.",
          )}
        </Link>
      </Notice>
      <div className="stats-grid">
        {stats.map(([key, ar, en, Icon]) => (
          <div className="stat" key={key}>
            <div className="stat-icon">
              <Icon size={23} />
            </div>
            <div>
              <strong>{counts?.[key] ?? "—"}</strong>
              <span>{t(ar, en)}</span>
            </div>
          </div>
        ))}
      </div>
      <Panel title={t("ابدأ بسرعة", "Quick actions")}>
        <div className="quick-actions">
          <Link to="/admin/products/new">
            <Plus />
            <span>
              {t("إضافة منتج", "Add product")}
              <small>
                {t("أسعار وخيارات وصور", "Prices, options and images")}
              </small>
            </span>
          </Link>
          <Link to="/admin/offers/new">
            <Tags />
            <span>
              {t("إنشاء عرض", "Create offer")}
              <small>{t("باقة أو عرض خاص", "Bundle or special")}</small>
            </span>
          </Link>
          <Link to="/admin/drive">
            <FolderSync />
            <span>
              {t("إعداد Google Drive", "Set up Google Drive")}
              <small>
                {t("الربط واختبار الزائر", "Connect and test visitor access")}
              </small>
            </span>
          </Link>
          <Link to="/admin/settings">
            <Settings />
            <span>
              {t("بيانات المحل", "Store details")}
              <small>
                {t("الاسم والشعار والتواصل", "Name, logo and contacts")}
              </small>
            </span>
          </Link>
        </div>
      </Panel>
      <Panel title={t("أحدث المنتجات", "Latest products")}>
        {latest.error && <Notice error>{latest.error}</Notice>}
        {latest.loading ? (
          <Loading />
        ) : latest.data.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("المنتج", "Product")}</th>
                  <th>{t("سعر القطعة", "Unit price")}</th>
                  <th>{t("الحالة", "Status")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {latest.data.map((p) => (
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
                        : formatMoney(
                            p.unitPriceMinor,
                            store.currency,
                            language,
                          )}
                    </td>
                    <td>
                      <span className="badge">
                        {t(
                          p.status === "published"
                            ? "منشور"
                            : p.status === "draft"
                              ? "مسودة"
                              : "مخفي",
                          p.status,
                        )}
                      </span>
                    </td>
                    <td>
                      <Link to={"/admin/products/" + p.id}>
                        {t("تعديل", "Edit")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Notice>
            {t(
              "ابدأ بإضافة قسم، ثم أول منتج",
              "Add a category, then your first product",
            )}
          </Notice>
        )}
      </Panel>
      <Link to="/admin/products" className="button button-ghost">
        {t("إدارة المنتجات وصورها", "Manage products and images")}
      </Link>
    </>
  );
}
