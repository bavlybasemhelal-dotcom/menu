import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { getDocFromServer } from "firebase/firestore";
import { auth, shopId } from "../integrations/firebase/client";
import { configRef } from "../integrations/firebase/repository";
import { useDocument } from "../integrations/firebase/hooks";
import { emptyStore, type StorePublic } from "../features/products/models";
import { localize } from "../features/products/logic";
import { readableBrandColor } from "../utils/colors";
type Language = "ar" | "en";
const UIContext = createContext<{
  language: Language;
  theme: string;
  toggleTheme: () => void;
  toggleLanguage: () => void;
  t: (ar: string, en: string) => string;
  store: StorePublic;
  storeLoading: boolean;
  storeError: string;
  storeExists: boolean;
  user: User | null;
  admin: boolean;
  authLoading: boolean;
  logout: () => Promise<void>;
}>({} as never);
export function AppProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(
    localStorage.getItem("catalog-language") === "en" ? "en" : "ar",
  );
  const [theme, setTheme] = useState(
    localStorage.getItem("catalog-theme") === "dark" ? "dark" : "light",
  );
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const shop = useDocument<StorePublic>("shops/" + shopId);
  const translate = useCallback(
    (ar: string, en: string) => (language === "ar" ? ar : en),
    [language],
  );
  const [user, setUser] = useState<User | null>(null),
    [admin, setAdmin] = useState(false),
    [authLoading, setAuthLoading] = useState(!!auth);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("catalog-theme", theme);
  }, [theme]);
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
    localStorage.setItem("catalog-language", language);
  }, [language]);
  useEffect(() => {
    if (shop.data && !localStorage.getItem("catalog-language-chosen"))
      setLanguage(shop.data.defaultLanguage);
  }, [shop.data]);
  useEffect(() => {
    document.title = shop.data
      ? localize(shop.data.name, language)
      : language === "ar"
        ? "كتالوج المحل"
        : "Store catalog";
  }, [shop.data, language]);
  useEffect(() => {
    const style = document.documentElement.style;
    if (!shop.data) return;
    const primary = readableBrandColor(shop.data.branding.primary, theme),
      accent = readableBrandColor(shop.data.branding.accent, theme),
      color = primary.color;
    style.setProperty("--primary", color);
    style.setProperty("--accent", accent.color);
    style.setProperty("--on-accent", accent.foreground);
    style.setProperty(
      "--primary-soft",
      "color-mix(in srgb, " + color + " 12%, var(--surface))",
    );
    style.setProperty("--on-primary", primary.foreground);
  }, [shop.data, theme]);
  useEffect(() => {
    if (!auth) return;
    let revision = 0;
    return onAuthStateChanged(auth, async (u) => {
      const current = ++revision;
      setUser(u);
      setAdmin(false);
      setAuthLoading(true);
      try {
        if (u) await getDocFromServer(configRef());
        if (current === revision) setAdmin(!!u);
      } catch {
        if (current === revision) setAdmin(false);
      } finally {
        if (current === revision) setAuthLoading(false);
      }
    });
  }, []);
  return (
    <UIContext.Provider
      value={{
        language,
        theme,
        toggleTheme: () => setTheme((v) => (v === "light" ? "dark" : "light")),
        toggleLanguage: () => {
          localStorage.setItem("catalog-language-chosen", "true");
          setLanguage((v) => (v === "ar" ? "en" : "ar"));
        },
        t: translate,
        store: shop.data || emptyStore(),
        storeLoading: shop.loading,
        storeError: shop.error,
        storeExists: !!shop.data,
        user,
        admin,
        authLoading,
        logout: async () => {
          if (auth) await signOut(auth);
        },
      }}
    >
      {children}
    </UIContext.Provider>
  );
}
export const useUI = () => useContext(UIContext);
