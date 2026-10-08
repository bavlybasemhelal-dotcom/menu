import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useParams } from "react-router-dom";
import {
  Search,
  Sparkles,
  Tag,
  MessageCircle,
  Share2,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { useUI } from "../../app/context";
import { useList, useDocument } from "../../integrations/firebase/hooks";
import { shopId } from "../../integrations/firebase/client";
import type { Product, Offer, Category } from "../products/models";
import {
  localize,
  inSchedule,
  hasActiveDiscount,
  normalizeSearch,
  money,
} from "../products/logic";
import { whatsappLink } from "../../utils/urls";
import {
  Brand,
  Button,
  ContactBar,
  Controls,
  Empty,
  Header,
  Loading,
  MediaImage,
  Notice,
  Pagination,
  Panel,
  PageTitle,
  Back,
} from "../../components/ui";
import { ProductCard, Prices, OfferCard } from "./Cards";
export function CatalogLayout() {
  const { t } = useUI();
  return (
    <>
      <Header />
      <main className="container">
        <nav className="mobile-nav">
          <NavLink to="/" end>
            {t("المنتجات", "Products")}
          </NavLink>
          <NavLink to="/offers">{t("العروض", "Offers")}</NavLink>
        </nav>
        <Outlet />
        <footer className="public-footer">
          <Brand />
          <Link to="/admin/login">{t("دخول الإدارة", "Admin sign in")}</Link>
        </footer>
      </main>
      <ContactBar />
    </>
  );
}
function Splash() {
  const { store, storeLoading, storeExists, t, language } = useUI(),
    brandingKey = JSON.stringify([shopId, store.name, store.logoMediaId]),
    [visible, setVisible] = useState(() => {
      const viewed = sessionStorage.getItem("catalog-splash");
      return (
        !viewed ||
        (!storeLoading && viewed !== "pending" && viewed !== brandingKey)
      );
    }),
    [settledLogo, setSettledLogo] = useState(""),
    checkedVisit = useRef(!storeLoading),
    logoLoading = !!store.logoMediaId && settledLogo !== store.logoMediaId;
  useEffect(() => {
    if (storeLoading) return;
    const viewed = sessionStorage.getItem("catalog-splash");
    if (viewed === "pending") {
      sessionStorage.setItem("catalog-splash", brandingKey);
      checkedVisit.current = true;
      setVisible(false);
      return;
    }
    if (checkedVisit.current) return;
    checkedVisit.current = true;
    setVisible(viewed !== brandingKey);
  }, [storeLoading, brandingKey]);
  useEffect(() => {
    if (!visible || storeLoading || logoLoading) return;
    const id = setTimeout(() => {
      setVisible(false);
      sessionStorage.setItem("catalog-splash", brandingKey);
    }, 1400);
    return () => clearTimeout(id);
  }, [visible, storeLoading, logoLoading, brandingKey]);
  if (!visible) return null;
  return (
    <div
      className="splash"
      role="region"
      aria-label={t("تقديم المحل", "Store introduction")}
      aria-busy={storeLoading || logoLoading}
    >
      <Controls />
      <Brand large onLogoSettled={setSettledLogo} />
      <p>
        {localize(store.description, language) ||
          t(
            "كل منتجات محلك وعروضه، في مكان واحد",
            "Your store’s products and offers, in one place",
          )}
      </p>
      {storeLoading || logoLoading ? (
        <Loading />
      ) : (
        <div className="splash-progress" />
      )}
      <Button
        type="button"
        className="button-ghost"
        onClick={() => {
          setVisible(false);
          sessionStorage.setItem(
            "catalog-splash",
            storeLoading ? "pending" : brandingKey,
          );
        }}
      >
        {t("تصفح الآن", "Browse now")}
      </Button>
      <span className="splash-bottom">
        {storeExists
          ? t("أهلاً بيك", "Welcome")
          : t("كتالوج قابل للتخصيص", "Customizable catalog")}
      </span>
    </div>
  );
}
export function Home() {
  const { t, storeError, storeExists, storeLoading } = useUI(),
    [category, setCategory] = useState(""),
    [text, setText] = useState(""),
    [search, setSearch] = useState(""),
    [onlyDiscount, setOnlyDiscount] = useState(false),
    [availability, setAvailability] = useState(""),
    categories = useList("categories"),
    offers = useList("offers", { placement: "hero" }),
    strips = useList("offers", { placement: "strip", pageSize: 4 }),
    products = useList("products", {
      pageSize: 36,
      category,
      search,
      discount: onlyDiscount,
      availability,
    });
  useEffect(() => {
    const id = setTimeout(
      () => setSearch(normalizeSearch(text).slice(0, 30)),
      300,
    );
    return () => clearTimeout(id);
  }, [text]);
  const active = offers.data.filter((o) => inSchedule(o)),
    hero = active.filter((o) => o.placement === "hero"),
    strip = strips.data.find((o) => inSchedule(o));
  return (
    <>
      <Splash />
      {storeError && (
        <Notice error>
          {t("تعذر تحميل إعدادات المحل: ", "Unable to load store settings: ") +
            storeError}
        </Notice>
      )}
      {!storeExists && !storeLoading && !storeError && (
        <Notice>
          {t(
            "الكتالوج لسه بيتجهز. بيانات المحل هتظهر بعد حفظها من الإدارة.",
            "The catalog is being prepared. Store details appear after the admin saves them.",
          )}
        </Notice>
      )}
      <div className="search-bar">
        <Search size={21} />
        <input
          aria-label={t("بحث في المنتجات", "Search catalog")}
          placeholder={t(
            "ابحث ببداية اسم المنتج أو كلمة منه…",
            "Search by a product name or word prefix…",
          )}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      <Hero offers={hero} />
      <div className="section-head">
        <h2>{t("تصفح الأقسام", "Browse categories")}</h2>
        <Link to="/offers">{t("اكتشف العروض", "Discover offers")} ←</Link>
      </div>
      {categories.error && <Notice error>{categories.error}</Notice>}
      <CategoryStrip
        categories={categories.data}
        selected={category}
        onSelect={setCategory}
      />
      {categories.hasNext && <Pagination {...categories} />}
      <div className="section-head">
        <h2>{t("منتجات المحل", "Store products")}</h2>
        <span className="price-caption">
          {t("الأسعار محدثة مباشرة", "Prices update live")}
        </span>
      </div>
      <div className="filters">
        <button
          className={"chip " + (!onlyDiscount ? "selected" : "")}
          onClick={() => setOnlyDiscount(false)}
        >
          {t("كل المنتجات", "All products")}
        </button>
        <button
          className={"chip " + (onlyDiscount ? "selected" : "")}
          onClick={() => setOnlyDiscount(true)}
        >
          <Tag size={13} style={{ display: "inline", marginInlineEnd: 6 }} />
          {t("عليها خصم", "Discounted")}
        </button>
        <select
          style={{ width: "auto" }}
          aria-label={t("تصفية بالتوفر", "Filter availability")}
          value={availability}
          onChange={(e) => setAvailability(e.target.value)}
        >
          <option value="">{t("كل حالات التوفر", "All availability")}</option>
          <option value="available">{t("متوفر", "Available")}</option>
          <option value="limited">{t("كمية محدودة", "Limited")}</option>
          <option value="unavailable">{t("غير متوفر", "Unavailable")}</option>
        </select>
      </div>
      {products.error && (
        <Notice error>
          {t("تعذر تحميل المنتجات: ", "Unable to load products: ") +
            products.error}
        </Notice>
      )}
      {products.loading ? (
        <Loading />
      ) : products.data.length ? (
        <div className="product-grid">
          {products.data
            .filter((p) => !onlyDiscount || hasActiveDiscount(p))
            .map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
        </div>
      ) : (
        <Empty
          title={t("مفيش منتجات مطابقة حاليًا", "No matching products yet")}
        >
          <p>
            {t("جرّب قسمًا أو اسمًا آخر", "Try a different category or name")}
          </p>
        </Empty>
      )}
      <Pagination {...products} />
      {strip && (
        <div className="catalog-strip">
          <OfferCard offer={strip} />
        </div>
      )}
    </>
  );
}
function CategoryStrip({
  categories,
  selected,
  onSelect,
}: {
  categories: Category[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const { t, language } = useUI();
  return (
    <div className="category-scroll">
      <button
        className={"category-pill " + (!selected ? "selected" : "")}
        onClick={() => onSelect("")}
      >
        {t("الكل", "All")}
      </button>
      {categories.map((c) => (
        <button
          className={"category-pill " + (selected === c.id ? "selected" : "")}
          key={c.id}
          onClick={() => onSelect(c.id)}
        >
          {c.coverMediaId && (
            <MediaImage
              id={c.coverMediaId}
              revision={c.updatedAt}
              alt={localize(c.name, language)}
            />
          )}{" "}
          {localize(c.name, language)}
        </button>
      ))}
    </div>
  );
}
function Hero({ offers }: { offers: Offer[] }) {
  const { store, t, language } = useUI(),
    [index, setIndex] = useState(0),
    offer = offers[index % Math.max(offers.length, 1)];
  useEffect(() => {
    if (
      offers.length < 2 ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const id = setInterval(() => {
      if (!document.hidden) setIndex((v) => (v + 1) % offers.length);
    }, 7000);
    return () => clearInterval(id);
  }, [offers.length]);
  return (
    <section
      className={
        "hero " +
        (!(offer?.imageMediaId || store.logoMediaId) ? "hero-text-only" : "")
      }
    >
      <div>
        <span className="eyebrow">
          <Sparkles size={16} />
          {offer
            ? localize(offer.callout, language) ||
              t("عرض مميز", "Featured offer")
            : t("اكتشف كل جديد", "Discover what’s new")}
        </span>
        <h2>
          {offer
            ? localize(offer.name, language)
            : localize(store.name, language) ||
              t("منتجات تناسب يومك", "Products for your day")}
        </h2>
        <p>
          {offer
            ? localize(offer.description, language)
            : localize(store.description, language) ||
              t(
                "تصفح المنتجات والأسعار والعروض، وتواصل معنا بسهولة.",
                "Browse products, prices and offers, and reach us easily.",
              )}
        </p>
        {offer && (
          <Link className="button" to={"/offers/" + offer.id}>
            {t("شوف تفاصيل العرض", "Explore the offer")}
            <ArrowLeft size={16} />
          </Link>
        )}
        {offers.length > 1 && (
          <div className="button-row" style={{ marginTop: 14 }}>
            <Button
              className="icon-button"
              aria-label={t("العرض السابق", "Previous banner")}
              onClick={() =>
                setIndex((v) => (v - 1 + offers.length) % offers.length)
              }
            >
              <ChevronRight size={17} />
            </Button>
            <small>
              {(index % offers.length) + 1} / {offers.length}
            </small>
            <Button
              className="icon-button"
              aria-label={t("العرض التالي", "Next banner")}
              onClick={() => setIndex((v) => (v + 1) % offers.length)}
            >
              <ChevronLeft size={17} />
            </Button>
          </div>
        )}
      </div>
      {(offer?.imageMediaId || store.logoMediaId) && (
        <MediaImage
          id={offer?.imageMediaId || store.logoMediaId}
          revision={offer?.updatedAt}
          alt={
            offer
              ? localize(offer.name, language)
              : localize(store.name, language)
          }
        />
      )}
    </section>
  );
}
export function Offers() {
  const { t } = useUI(),
    [tab, setTab] = useState("discounts"),
    offers = useList("offers", { type: tab === "discounts" ? "" : tab }),
    discounts = useList("products", { discount: true }),
    active = offers.data.filter((o) => inSchedule(o));
  return (
    <>
      <PageTitle
        title={t("عروض تستاهل تتشاف", "Offers worth exploring")}
        subtitle={t(
          "خصومات، باقات، وعروض خاصة من محلك",
          "Discounts, bundles and specials from your store",
        )}
      />
      <div className="tabs" role="tablist">
        {[
          ["discounts", "الخصومات", "Discounts"],
          ["bundle", "الباقات", "Bundles"],
          ["special", "العروض الخاصة", "Specials"],
        ].map(([id, ar, en]) => (
          <button
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "selected" : ""}
            key={id}
            onClick={() => setTab(id)}
          >
            {t(ar, en)}
          </button>
        ))}
      </div>
      {(offers.error || discounts.error) && (
        <Notice error>{offers.error || discounts.error}</Notice>
      )}
      {tab === "discounts" ? (
        <>
          {discounts.loading ? (
            <Loading />
          ) : (
            <div className="product-grid">
              {discounts.data
                .filter((p) => hasActiveDiscount(p))
                .map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
            </div>
          )}
          {!discounts.loading &&
            !discounts.data.some((p) => hasActiveDiscount(p)) && (
              <Empty
                title={t(
                  "لا توجد خصومات سارية في هذه الصفحة",
                  "No active discounts on this page",
                )}
              />
            )}
          <Pagination {...discounts} />
        </>
      ) : (
        <>
          {offers.loading ? (
            <Loading />
          ) : (
            <div className="offer-grid">
              {active
                .filter((o) => o.type === tab)
                .map((o) => (
                  <OfferCard key={o.id} offer={o} />
                ))}
            </div>
          )}
          {!offers.loading && !active.some((o) => o.type === tab) && (
            <Empty
              title={t(
                "لا توجد عروض سارية في هذه الصفحة",
                "No active offers on this page",
              )}
            />
          )}
          <Pagination {...offers} />
        </>
      )}
    </>
  );
}
export function ProductDetail() {
  const { id } = useParams(),
    { t, language, store } = useUI(),
    loaded = useDocument<Product>("shops/" + shopId + "/products/" + id),
    p = loaded.data,
    [image, setImage] = useState(0),
    [variant, setVariant] = useState(""),
    [shared, setShared] = useState(false);
  if (loaded.loading) return <Loading />;
  if (loaded.error || !p || p.status !== "published")
    return (
      <>
        <Back />
        <Empty
          title={t("المنتج غير متاح حاليًا", "Product is not available")}
        />
      </>
    );
  const selected = p.variants.find((v) => v.id === variant),
    name = localize(p.name, language),
    inquiry = whatsappLink(
      store.whatsappNumber,
      name,
      window.location.href,
      language,
    ),
    display =
      selected?.unitPriceMinor !== null &&
      selected?.unitPriceMinor !== undefined
        ? { ...p, unitPriceMinor: selected.unitPriceMinor }
        : p;
  return (
    <>
      <Back />
      <div className="detail-grid">
        <div className="detail-image">
          <MediaImage
            id={p.imageMediaIds[image]}
            revision={p.updatedAt}
            alt={name}
          />
          <div className="thumbnail-list">
            {p.imageMediaIds.map((mid, i) => (
              <button
                className={image === i ? "selected" : ""}
                key={mid}
                onClick={() => setImage(i)}
                aria-label={t("صورة", "Image") + " " + (i + 1)}
              >
                <MediaImage id={mid} revision={p.updatedAt} alt={name} />
              </button>
            ))}
          </div>
        </div>
        <div className="detail-content">
          <span className="badge">
            {t(
              p.availability === "available"
                ? "متوفر"
                : p.availability === "limited"
                  ? "كمية محدودة"
                  : "غير متوفر",
              p.availability,
            )}
          </span>
          <h1>{name}</h1>
          <div className="detail-price">
            <Prices product={display} />
          </div>
          <p>{localize(p.description, language)}</p>
          {p.variants.length > 0 && (
            <div className="filters">
              {p.variants.map((v) => (
                <button
                  className={"chip " + (variant === v.id ? "selected" : "")}
                  disabled={!v.available}
                  key={v.id}
                  onClick={() => setVariant(v.id)}
                >
                  {localize(v.label, language)}{" "}
                  {v.unitPriceMinor !== null
                    ? " · " + money(v.unitPriceMinor, store.currency, language)
                    : ""}
                </button>
              ))}
              <button className="chip" onClick={() => setVariant("")}>
                {t("الأساسي", "Default")}
              </button>
            </div>
          )}
          <div className="button-row">
            {inquiry && (
              <a
                className="button"
                href={inquiry}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={19} />
                {t("استفسر عن المنتج", "Ask about this product")}
              </a>
            )}
            <Button
              className="button-ghost"
              onClick={async () => {
                try {
                  if (navigator.share)
                    await navigator.share({
                      title: name,
                      url: window.location.href,
                    });
                  else {
                    await navigator.clipboard.writeText(window.location.href);
                    setShared(true);
                  }
                } catch {
                  setShared(false);
                }
              }}
            >
              <Share2 size={18} />
              {shared
                ? t("تم نسخ الرابط", "Link copied")
                : t("مشاركة", "Share")}
            </Button>
          </div>
        </div>
      </div>
      <Related category={p.categoryId} exclude={p.id} />
    </>
  );
}
function Related({ category, exclude }: { category: string; exclude: string }) {
  const { t } = useUI(),
    list = useList("products", { category, pageSize: 4 });
  return list.data.some((p) => p.id !== exclude) ? (
    <>
      <div className="section-head">
        <h2>{t("قد يعجبك أيضًا", "You may also like")}</h2>
      </div>
      <div className="product-grid">
        {list.data
          .filter((p) => p.id !== exclude)
          .map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
      </div>
    </>
  ) : null;
}
export function OfferDetail() {
  const { id } = useParams(),
    { t, language, store } = useUI(),
    loaded = useDocument<Offer>("shops/" + shopId + "/offers/" + id),
    o = loaded.data;
  if (loaded.loading) return <Loading />;
  if (
    loaded.error ||
    !o ||
    o.status !== "published" ||
    o.needsReview ||
    !inSchedule(o)
  )
    return (
      <>
        <Back />
        <Empty title={t("العرض غير سارٍ حاليًا", "Offer is not active")} />
      </>
    );
  const name = localize(o.name, language),
    price =
      o.type === "bundle"
        ? o.bundleFinalPriceMinor
        : o.specialDisplayPriceMinor,
    inquiry = whatsappLink(
      store.whatsappNumber,
      name,
      window.location.href,
      language,
    );
  return (
    <>
      <Back />
      <div className="detail-grid">
        <div className="detail-image">
          <MediaImage id={o.imageMediaId} revision={o.updatedAt} alt={name} />
        </div>
        <div className="detail-content">
          <span className="eyebrow">
            <Tag size={16} />
            {localize(o.callout, language) ||
              t(
                o.type === "bundle" ? "باقة مميزة" : "عرض خاص",
                o.type === "bundle" ? "Special bundle" : "Special offer",
              )}
          </span>
          <h1>{name}</h1>
          <p>{localize(o.description, language)}</p>
          {price !== null && (
            <strong className="price-value">
              {money(price, store.currency, language)}
            </strong>
          )}
          {o.type === "bundle" && (
            <Panel title={t("محتويات الباقة", "Bundle contents")}>
              {o.bundleItems.map((item, i) => (
                <BundleItem key={i} {...item} />
              ))}
              <small>
                {t(
                  "سعر الباقة مستقل عن خصومات المنتجات",
                  "Bundle price is independent of product discounts",
                )}
              </small>
            </Panel>
          )}
          {localize(o.conditions, language) && (
            <Panel
              title={t("تفاصيل وشروط العرض", "Offer details and conditions")}
            >
              <p>{localize(o.conditions, language)}</p>
            </Panel>
          )}
          {o.endsAt && (
            <p className="price-caption">
              {t("سارٍ حتى ", "Valid until ") +
                new Date(o.endsAt).toLocaleString(
                  language === "ar" ? "ar-EG" : "en-GB",
                )}
            </p>
          )}
          {inquiry && (
            <a
              className="button"
              href={inquiry}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={19} />
              {t("استفسر عن العرض", "Ask about this offer")}
            </a>
          )}
        </div>
      </div>
      {o.productIds.length > 0 && (
        <div className="offer-grid" style={{ marginTop: 25 }}>
          {o.productIds.map((pid) => (
            <OfferProduct key={pid} id={pid} />
          ))}
        </div>
      )}
    </>
  );
}
function BundleItem({
  productId,
  quantity,
  unit,
}: {
  productId: string;
  quantity: number;
  unit: "unit" | "box" | "carton";
}) {
  const { t, language } = useUI(),
    { data } = useDocument<Product>(
      "shops/" + shopId + "/products/" + productId,
    );
  return (
    <p>
      {data?.status === "published" ? (
        <Link to={"/products/" + productId}>
          {localize(data.name, language)}
        </Link>
      ) : (
        t("منتج غير متاح", "Unavailable item")
      )}{" "}
      × {quantity}{" "}
      {t(unit === "unit" ? "قطعة" : unit === "box" ? "علبة" : "كرتونة", unit)}
    </p>
  );
}
function OfferProduct({ id }: { id: string }) {
  const { data } = useDocument<Product>("shops/" + shopId + "/products/" + id);
  return data?.status === "published" ? <ProductCard product={data} /> : null;
}
