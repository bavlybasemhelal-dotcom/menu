import { Link } from "react-router-dom";
import { ChevronLeft, Tag } from "lucide-react";
import { useUI } from "../../app/context";
import { MediaImage } from "../../components/ui";
import { Prices } from "./Prices";
import type { ProductData, Product, Offer } from "../products/models";
import { localize, hasActiveDiscount, money } from "../products/logic";
export { Prices } from "./Prices";
export function ProductCard({
  product,
  preview = false,
}: {
  product: Product | ProductData;
  preview?: boolean;
}) {
  const { language, t } = useUI(),
    name = localize(product.name, language) || t("اسم المنتج", "Product name"),
    id = "id" in product ? product.id : "";
  const card = (
    <>
      <MediaImage
        id={product.imageMediaIds[0]}
        revision={"updatedAt" in product ? product.updatedAt : undefined}
        alt={name}
      />
      {hasActiveDiscount(product) && (
        <span className="badge badge-discount">
          <Tag size={12} />
          {product.discount?.kind === "percent"
            ? product.discount.value + "%"
            : t("خصم إضافي", "Extra discount")}
        </span>
      )}
      <div className="product-info">
        <h3>{name}</h3>
        <Prices product={product} compact />
        <div className="card-footer">
          <span
            className={
              "badge " +
              (product.availability === "available" ? "" : "badge-warning")
            }
          >
            {t(
              product.availability === "available"
                ? "متوفر"
                : product.availability === "limited"
                  ? "كمية محدودة"
                  : "غير متوفر",
              product.availability === "available"
                ? "Available"
                : product.availability === "limited"
                  ? "Limited"
                  : "Unavailable",
            )}
          </span>
          {!preview && (
            <span className="card-detail">
              {t("التفاصيل", "Details")}
              <ChevronLeft size={15} />
            </span>
          )}
        </div>
      </div>
    </>
  );
  return preview ? (
    <div className="product-card">{card}</div>
  ) : (
    <Link to={"/products/" + id} className="product-card" aria-label={name}>
      {card}
    </Link>
  );
}
export function OfferCard({ offer }: { offer: Offer }) {
  const { language, t, store } = useUI(),
    price =
      offer.type === "bundle"
        ? offer.bundleFinalPriceMinor
        : offer.specialDisplayPriceMinor;
  return (
    <Link to={"/offers/" + offer.id} className="offer-card">
      <MediaImage
        id={offer.imageMediaId}
        revision={offer.updatedAt}
        alt={localize(offer.name, language)}
      />
      <div className="offer-info">
        <span className="eyebrow">
          {t(
            offer.type === "bundle" ? "باقة بسعر خاص" : "عرض خاص",
            offer.type === "bundle" ? "Bundle offer" : "Special offer",
          )}
        </span>
        <h3>{localize(offer.name, language)}</h3>
        <p>{localize(offer.description, language)}</p>
        {price !== null && (
          <strong className="price-value">
            {money(price, store.currency, language)}
          </strong>
        )}
        <span className="card-detail">
          {t("اكتشف العرض", "View offer")}
          <ChevronLeft size={15} />
        </span>
      </div>
    </Link>
  );
}
