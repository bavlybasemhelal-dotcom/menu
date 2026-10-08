import { useUI } from "../../app/context";
import type { ProductData } from "../products/models";
import { money, productPrices, piecesPerCarton } from "../products/logic";
export function Prices({ product }: { product: ProductData }) {
  const { t, store, language } = useUI();
  const number = (v: number) =>
    new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-GB").format(v);
  let prices: {
    unit: number | null;
    box: number | null;
    carton: number | null;
  };
  try {
    prices = productPrices(product);
  } catch {
    prices = {
      unit: product.unitPriceMinor,
      box: product.boxPriceMinor ?? null,
      carton: product.cartonPriceMinor,
    };
  }
  const rows = [
    {
      unit: "unit" as const,
      price: prices.unit,
      base: product.unitPriceMinor,
      label: t("للقطعة", "per piece"),
      packing: "",
    },
    {
      unit: "box" as const,
      price: prices.box,
      base: product.boxPriceMinor,
      label: t("للعلبة", "per box"),
      packing: product.boxQuantity
        ? number(product.boxQuantity) + " " + t("قطعة / علبة", "pieces / box")
        : "",
    },
    {
      unit: "carton" as const,
      price: prices.carton,
      base: product.cartonPriceMinor,
      label: t("للكرتونة", "per carton"),
      packing: product.cartonBoxQuantity
        ? number(product.cartonBoxQuantity) +
          " " +
          t("علبة / كرتونة", "boxes / carton") +
          " · " +
          number(piecesPerCarton(product)!) +
          " " +
          t("قطعة", "pieces")
        : "",
    },
  ];
  return (
    <>
      {rows
        .filter((row) => row.price != null)
        .map((row) => (
          <div
            className={
              "price-row " + (row.unit === "unit" ? "" : "carton-price")
            }
            key={row.unit}
            data-unit={row.unit}
          >
            <strong className="price-value">
              {money(row.price!, store.currency, language)}
            </strong>
            <span className="price-caption">{row.label}</span>
            {row.base != null && row.price! < row.base && (
              <span className="old-price">
                {money(row.base, store.currency, language)}
              </span>
            )}
            {row.packing && (
              <small className="packing-caption">{row.packing}</small>
            )}
          </div>
        ))}
    </>
  );
}
