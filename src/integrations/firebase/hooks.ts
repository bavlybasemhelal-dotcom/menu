import { useEffect, useMemo, useState } from "react";
import {
  doc,
  getDocFromServer,
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
export function useDocument<T>(
  path: string | null,
  options: { live?: boolean; revision?: unknown } = {},
) {
  const { live = true, revision } = options;
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
    if (!live) {
      let active = true;
      void getDocFromServer(doc(db, path))
        .then((s) => {
          if (active)
            set({
              data: s.exists()
                ? { ...(decode(s.data()) as T), id: s.id }
                : null,
              loading: false,
              error: "",
            });
        })
        .catch((e) => {
          if (active) set({ data: null, loading: false, error: e.code });
        });
      return () => {
        active = false;
      };
    }
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
  }, [path, live, revision]);
  return state;
}
export interface ListOptions {
  enabled?: boolean;
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
    enabled = true,
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
    enabled,
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
    if (!db || !enabled) {
      set({
        data: [],
        loading: false,
        error: !db
          ? "Firebase configuration missing / إعداد Firebase غير مكتمل"
          : "",
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
    enabled,
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
