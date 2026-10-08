import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  Outlet,
  Link,
} from "react-router-dom";
import {
  Package,
  LayoutDashboard,
  Tags,
  Settings,
  FolderSync,
  Layers,
  LogOut,
  Image,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppProvider, useUI } from "./context";
import { Header, Loading, Notice, Button, Empty } from "../components/ui";
import { emulator as emulatorMode } from "../integrations/firebase/client";
import Login from "../features/admin/Auth";
import Dashboard from "../features/admin/Dashboard";
import SettingsPage from "../features/admin/Settings";
import ProductEditor from "../features/admin/ProductEditor";
import OfferEditor from "../features/admin/OfferEditor";
import DriveSetup from "../features/admin/DriveSetup";
import {
  ProductsList,
  OffersList,
  Categories,
} from "../features/admin/ContentLists";
import {
  CatalogLayout,
  Home,
  Offers,
  ProductDetail,
  OfferDetail,
} from "../features/catalog/Catalog";
export function AdminGuard() {
  const { authLoading, user, admin, t, logout } = useUI();
  if (authLoading) return <Loading />;
  if (!user) return <Navigate to="/admin/login" replace />;
  if (!admin)
    return (
      <>
        <Header />
        <main className="container">
          <Notice error>
            {t(
              "الحساب غير مصرح له. أضف UID المالك في قواعد Firestore.",
              "Account is not authorized. Configure the owner UID in Firestore Rules.",
            )}
          </Notice>
          <Link to="/admin/login">{t("الرجوع للدخول", "Return to login")}</Link>
          <Button className="button-ghost" onClick={logout}>
            {t("تسجيل الخروج", "Sign out")}
          </Button>
        </main>
      </>
    );
  return <Outlet />;
}
export function AdminLayout() {
  const { t, logout } = useUI();
  const links = [
    ["/admin", "الرئيسية", "Dashboard", LayoutDashboard],
    ["/admin/products", "المنتجات", "Products", Package],
    ["/admin/categories", "الأقسام", "Categories", Layers],
    ["/admin/offers", "العروض", "Offers", Tags],
    ["/admin/settings", "الإعدادات", "Settings", Settings],
    ["/admin/banners", "البنرات", "Banners", Image],
    ["/admin/drive", "Google Drive", "Google Drive", FolderSync],
  ] as const;
  return (
    <>
      <Header admin />
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <nav>
            {links.map(([to, ar, en, Icon]) => (
              <NavLink key={to} to={to} end={to === "/admin"}>
                <Icon size={20} />
                {t(ar, en)}
              </NavLink>
            ))}
          </nav>
          <Button className="button-ghost" onClick={logout}>
            <LogOut size={18} />
            {t("تسجيل الخروج", "Sign out")}
          </Button>
        </aside>
        <main className="admin-content">
          <div className="mobile-nav">
            <Link to="/admin/settings">{t("الإعدادات", "Settings")}</Link>
            <Link to="/admin/drive">Drive</Link>
            <Link to="/admin/banners">{t("البنرات", "Banners")}</Link>
            <Button
              className="button-ghost"
              onClick={logout}
              aria-label={t("تسجيل الخروج", "Sign out")}
            >
              <LogOut size={15} />
            </Button>
          </div>
          <Outlet />
          <footer className="admin-footer">
            <span>
              {t(
                "تعديلاتك المنشورة تظهر مباشرة للزائر",
                "Published changes update the visitor immediately",
              )}
            </span>
            <Link to="/" target="_blank">
              {t("معاينة الكتالوج ↗", "View catalog ↗")}
            </Link>
          </footer>
        </main>
      </div>
    </>
  );
}
function Connectivity() {
  const { t } = useUI(),
    [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return (
    <>
      {emulatorMode && (
        <div className="emulator-notice">
          {t(
            "بيئة اختبار محلية — البيانات على المحاكي، ربط Drive الحقيقي غير متحقق",
            "Local test environment — emulator data; live Drive integration not verified",
          )}
        </div>
      )}
      {offline && (
        <div className="offline-note">
          {t(
            "الاتصال غير متاح. قد تكون الأسعار المعروضة قديمة.",
            "Offline. Displayed prices may be out of date.",
          )}
        </div>
      )}
    </>
  );
}
function NotFound() {
  const { t } = useUI();
  return (
    <Empty title={t("الصفحة غير موجودة", "Page not found")}>
      <Link to="/">{t("الرجوع للمحل", "Back to store")}</Link>
    </Empty>
  );
}
export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Connectivity />
        <Routes>
          <Route element={<CatalogLayout />}>
            <Route index element={<Home />} />
            <Route path="offers" element={<Offers />} />
            <Route path="offers/:id" element={<OfferDetail />} />
            <Route path="products/:id" element={<ProductDetail />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route
            path="/admin/login"
            element={
              <>
                <Header />
                <Login />
              </>
            }
          />
          <Route
            path="/admin/forgot-password"
            element={
              <>
                <Header />
                <Login />
              </>
            }
          />
          <Route element={<AdminGuard />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="categories" element={<Categories />} />
              <Route path="products" element={<ProductsList />} />
              <Route path="products/new" element={<ProductEditor />} />
              <Route path="products/:id" element={<ProductEditor />} />
              <Route path="products/:id/edit" element={<ProductEditor />} />
              <Route path="offers" element={<OffersList />} />
              <Route path="banners" element={<OffersList banners />} />
              <Route path="offers/new" element={<OfferEditor />} />
              <Route path="offers/:id" element={<OfferEditor />} />
              <Route path="media" element={<Navigate to="/admin/products" replace />} />
              <Route path="drive" element={<DriveSetup />} />
              <Route
                path="integrations/google-drive"
                element={<DriveSetup />}
              />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
