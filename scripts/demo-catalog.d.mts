import type {
  StorePublic,
  CategoryData,
  ProductData,
  OfferData,
} from "../src/features/products/models";
export const demoPrefix: string;
export function createDemoCatalog(): {
  store: StorePublic;
  categories: { id: string; data: CategoryData }[];
  products: { id: string; data: ProductData }[];
  offers: { id: string; data: OfferData }[];
};
