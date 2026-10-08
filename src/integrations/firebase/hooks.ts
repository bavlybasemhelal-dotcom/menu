import { useEffect, useMemo, useState } from "react";
import {
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import type {
  CollectionModels,
  CollectionName,
} from "../../features/products/models";
import { db, shopId } from "./client";
import { decode } from "./codec";
export function useDocument<T>(path: string | null) {
  const [state, set] = useState<{
    data: T | null;
    loading: boolean;
    error: string;
  }>({ data: null, loading: !!path, error: "" });
  useEffect(() => {
    if (!path || !db) {
      set({
        data: null,
        loading: false,
        error: !db
          ? "Firebase configuration missing / إعداد Firebase غير مكتمل"
          : "",
      });
      return;
    }
    set({ data: null, loading: true, error: "" });
    return onSnapshot(
      doc(db, path),
      (s) =>
        set({
          data: s.exists() ? { ...(decode(s.data()) as T), id: s.id } : null,
          loading: false,
          error: "",
        }),
      (e) => set({ data: null, loading: false, error: e.code }),
    );
  }, [path]);
  return state;
}
export interface ListOptions {
  admin?: boolean;
  category?: string;
  search?: string;
  discount?: boolean;
  availability?: string;
  status?: string;
  type?: string;
  placement?: string;
  pageSize?: number;
}
export function useList<K extends CollectionName>(
  name: K,
  options: ListOptions = {},
) {
  const {
    admin = false,
    category = "",
    search = "",
    discount = false,
    availability = "",
    status = "",
    type = "",
    placement = "",
    pageSize = 24,
  } = options;
  const key = [
    name,
    admin,
    category,
    search,
    discount,
    availability,
    status,
    type,
    placement,
    pageSize,
  ].join("|");
  const [cursor, setCursor] = useState<QueryDocumentSnapshot | null>(null),
    [page, setPage] = useState(1);
  const [state, set] = useState<{
    data: CollectionModels[K][];
    loading: boolean;
    error: string;
    last: QueryDocumentSnapshot | null;
    hasNext: boolean;
  }>({ data: [], loading: true, error: "", last: null, hasNext: false });
  useEffect(() => {
    setCursor(null);
    setPage(1);
  }, [key]);
  useEffect(() => {
    if (!db) {
      set({
        data: [],
        loading: false,
        error: "Firebase configuration missing / إعداد Firebase غير مكتمل",
        last: null,
        hasNext: false,
      });
      return;
    }
    const clauses: QueryConstraint[] = [];
    if (!admin) {
      if (name === "media") {
        clauses.push(
          where("status", "==", "public_test_passed"),
          where("publicShared", "==", true),
        );
      } else clauses.push(where("status", "==", "published"));
      if (name === "offers") clauses.push(where("needsReview", "==", false));
    }
    if (category) clauses.push(where("categoryId", "==", category));
    if (search) clauses.push(where("searchTokens", "array-contains", search));
    if (discount) clauses.push(where("discountEligible", "==", true));
    if (availability) clauses.push(where("availability", "==", availability));
    if (admin && status) clauses.push(where("status", "==", status));
    if (type) clauses.push(where("type", "==", type));
    if (placement === "banner")
      clauses.push(where("placement", "in", ["hero", "strip"]));
    else if (placement) clauses.push(where("placement", "==", placement));
    clauses.push(
      orderBy(
        name === "categories"
          ? "order"
          : name === "offers"
            ? "displayOrder"
            : "updatedAt",
        name === "categories" || name === "offers" ? "asc" : "desc",
      ),
    );
    if (cursor) clauses.push(startAfter(cursor));
    clauses.push(limit(pageSize + 1));
    set((v) => ({ ...v, loading: true, error: "" }));
    return onSnapshot(
      query(collectionRef(name), ...clauses),
      (snap) => {
        const docs = snap.docs.slice(0, pageSize);
        set({
          data: docs.map((d) => ({
            ...(decode(d.data()) as CollectionModels[K]),
            id: d.id,
          })),
          loading: false,
          error: "",
          last: docs.at(-1) || null,
          hasNext: snap.docs.length > pageSize,
        });
      },
      (e) => set((v) => ({ ...v, data: [], loading: false, error: e.code })),
    );
  }, [
    key,
    cursor,
    name,
    admin,
    category,
    search,
    discount,
    availability,
    status,
    type,
    placement,
    pageSize,
  ]);
  return useMemo(
    () => ({
      ...state,
      page,
      next: () => {
        if (state.last) {
          setCursor(state.last);
          setPage((p) => p + 1);
        }
      },
      first: () => {
        setCursor(null);
        setPage(1);
      },
    }),
    [state, page],
  );
}
import { collection } from "firebase/firestore";
function collectionRef(name: CollectionName) {
  return collection(db!, "shops", shopId, name);
}
