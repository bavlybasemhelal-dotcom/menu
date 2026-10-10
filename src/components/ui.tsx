import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  useRef,
  type ReactNode,
  type ButtonHTMLAttributes,
} from "react";
import {
  Moon,
  Sun,
  Languages,
  Store,
  Package,
  ArrowLeft,
  LoaderCircle,
  ImageOff,
  MessageCircle,
  Facebook,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import { useUI } from "../app/context";
import { useDocument } from "../integrations/firebase/hooks";
import { shopId } from "../integrations/firebase/client";
import { localize } from "../features/products/logic";
import type { Localized, Media } from "../features/products/models";
import {
  safeFacebook,
  whatsappUrl,
  isDriveAssetUrl,
  isBridgeImageUrl,
} from "../utils/urls";
import {
  publicImage,
  forgetPublicImage,
} from "../integrations/drive/image-cache";
export function Button({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={"button " + className} {...props}>
      {children}
    </button>
  );
}
export function Controls() {
  const u = useUI();
  return (
    <div className="controls">
      <Button
        className="icon-button"
        onClick={u.toggleTheme}
        aria-label={u.t("تبديل المظهر", "Toggle theme")}
      >
        {u.theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
      </Button>
      <Button
        className="locale-button"
        onClick={u.toggleLanguage}
        aria-label={u.t("تبديل اللغة", "Toggle language")}
      >
        <Languages size={17} />
        {u.language === "ar" ? "EN" : "عربي"}
      </Button>
    </div>
  );
}
export function MediaImage({
  id,
  alt,
  className = "",
  revision,
  onSettled,
  eager = false,
}: {
  id: string | null | undefined;
  alt: string;
  className?: string;
  revision?: number;
  onSettled?: (id: string) => void;
  eager?: boolean;
}) {
  const { user, store } = useUI();
  const [activated, setActivated] = useState(eager);
  const mediaRevision = useMemo(
    () => ({ user: user?.uid, store, revision }),
    [user?.uid, store, revision],
  );
  const { data, loading, error } = useDocument<Media>(
      id && activated ? "shops/" + shopId + "/media/" + id : null,
      { live: false, revision: mediaRevision },
    ),
    [failed, setFailed] = useState(false),
    [asset, setAsset] = useState<{
      url: string;
      src: string;
      revision: unknown;
    } | null>(null),
    element = useRef<HTMLDivElement>(null);
  const url =
    data &&
    data.id === id &&
    data.status === "public_test_passed" &&
    data.publicShared
      ? data.verifiedPublicAssetUrl
      : null;
  useEffect(() => setFailed(false), [id, data?.verifiedPublicAssetUrl]);
  useEffect(() => {
    if (activated) return;
    if (eager || typeof IntersectionObserver === "undefined") {
      setActivated(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setActivated(true);
          observer.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    if (element.current) observer.observe(element.current);
    return () => observer.disconnect();
  }, [activated, eager]);
  useEffect(() => {
    if (!activated || !id || loading || (data && data.id !== id)) return;
    if (
      failed ||
      error ||
      !data ||
      data.status !== "public_test_passed" ||
      !data.publicShared ||
      !data.verifiedPublicAssetUrl ||
      !isDriveAssetUrl(data.verifiedPublicAssetUrl)
    )
      onSettled?.(id);
  }, [activated, id, loading, data, error, failed, onSettled]);
  useEffect(() => {
    if (!url || !isBridgeImageUrl(url)) return;
    let disposed = false,
      objectUrl = "";
    const load = async () => {
      try {
        const blob = await publicImage(url, eager);
        if (disposed) return;
        objectUrl = URL.createObjectURL(blob);
        setFailed(false);
        setAsset({ url, src: objectUrl, revision: mediaRevision });
      } catch {
        if (!disposed) setFailed(true);
      }
    };
    void load();
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url, eager, mediaRevision]);
  const src =
    url && isBridgeImageUrl(url)
      ? asset?.url === url && asset.revision === mediaRevision
        ? asset.src
        : null
      : url;
  return (
    <div
      ref={element}
      className={"media-image " + className}
      data-media-id={id}
      data-file-id={data?.driveFileId}
    >
      {data?.status === "public_test_passed" &&
      data.publicShared &&
      data.verifiedPublicAssetUrl &&
      isDriveAssetUrl(data.verifiedPublicAssetUrl) &&
      !failed ? (
        src ? (
          <img
            src={src}
            alt={alt}
            loading={eager ? "eager" : "lazy"}
            fetchPriority={eager ? "high" : "auto"}
            decoding="async"
            referrerPolicy="strict-origin-when-cross-origin"
            crossOrigin="anonymous"
            onLoad={() => {
              if (id) onSettled?.(id);
            }}
            onError={() => {
              if (url) forgetPublicImage(url);
              setFailed(true);
            }}
          />
        ) : (
          <LoaderCircle className="spin" size={22} aria-label={alt} />
        )
      ) : id && activated && loading ? (
        <LoaderCircle className="spin" size={22} aria-label={alt} />
      ) : id && activated ? (
        <ImageOff size={36} aria-label={alt} />
      ) : (
        <Package size={44} strokeWidth={1.1} aria-label={alt} />
      )}
    </div>
  );
}
import { useEffect, useState, useMemo } from "react";
export function Brand({
  large = false,
  onLogoSettled,
}: {
  large?: boolean;
  onLogoSettled?: (id: string) => void;
}) {
  const { store, language, t } = useUI();
  return (
    <Link to="/" className={"brand " + (large ? "brand-large" : "")}>
      <span className="brand-mark">
        {store.logoMediaId ? (
          <MediaImage
            key={store.logoMediaId}
            id={store.logoMediaId}
            onSettled={onLogoSettled}
            eager
            alt={localize(store.name, language)}
          />
        ) : (
          <Store size={large ? 40 : 24} />
        )}
      </span>
      <span>
        {localize(store.name, language) || t("كتالوج المحل", "Store catalog")}
      </span>
    </Link>
  );
}
export function Header({ admin = false }: { admin?: boolean }) {
  const { t } = useUI();
  return (
    <header className="site-header">
      <div className="header-inner">
        <Brand />
        <nav className="desktop-nav">
          <Link to="/">{t("المنتجات", "Products")}</Link>
          <Link to="/offers">{t("العروض", "Offers")}</Link>
          {admin && <Link to="/admin">{t("لوحة الإدارة", "Dashboard")}</Link>}
        </nav>
        <Controls />
      </div>
    </header>
  );
}
export function ContactBar() {
  const { store, t } = useUI();
  const wa = whatsappUrl(store.whatsappNumber),
    fb = safeFacebook(store.facebookUrl);
  if (!wa && !fb) return null;
  return (
    <aside className="contact-bar">
      {wa && (
        <a
          className="contact-whatsapp"
          href={wa}
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircle size={21} />
          {t("تواصل واتساب", "WhatsApp")}
        </a>
      )}
      {fb && (
        <a
          className="contact-facebook"
          href={fb}
          target="_blank"
          rel="noreferrer"
        >
          <Facebook size={21} />
          {t("صفحتنا على فيسبوك", "Facebook")}
        </a>
      )}
    </aside>
  );
}
export function Panel({
  title,
  subtitle,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={"panel " + className}>
      {title && (
        <div className="panel-heading">
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  function decorate(node: ReactNode): ReactNode {
    if (
      !isValidElement<{
        children?: ReactNode;
        id?: string;
        "aria-describedby"?: string;
      }>(node)
    )
      return node;
    if (
      typeof node.type === "string" &&
      ["input", "select", "textarea"].includes(node.type)
    )
      return cloneElement(node, {
        id,
        "aria-describedby": hint ? id + "-hint" : undefined,
      });
    return node.props.children
      ? cloneElement(node, {
          children: Children.map(node.props.children, decorate),
        })
      : node;
  }
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {Children.map(children, decorate)}
      {hint && <small id={id + "-hint"}>{hint}</small>}
    </div>
  );
}
export function Bilingual({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: Localized;
  onChange: (v: Localized) => void;
  multiline?: boolean;
}) {
  const { t } = useUI();
  const Input = multiline ? "textarea" : "input";
  return (
    <fieldset className="bilingual">
      <legend>{label}</legend>
      <Field label={t("العربية", "Arabic")}>
        <Input
          lang="ar"
          dir="rtl"
          value={value.ar}
          onChange={(e) => onChange({ ...value, ar: e.target.value })}
        />
      </Field>
      <Field label={t("الإنجليزية", "English")}>
        <Input
          lang="en"
          dir="ltr"
          value={value.en}
          onChange={(e) => onChange({ ...value, en: e.target.value })}
        />
      </Field>
    </fieldset>
  );
}
export function Notice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={"notice " + (error ? "notice-error" : "")}
      role={error ? "alert" : "status"}
    >
      {children}
    </div>
  );
}
export function Loading() {
  const { t } = useUI();
  return (
    <div className="loading">
      <LoaderCircle className="spin" />
      {t("جارٍ التحميل…", "Loading…")}
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty">
      <Store size={42} />
      <h3>{title}</h3>
      {children}
    </div>
  );
}
export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
export function Pagination({
  page,
  hasNext,
  next,
  first,
}: {
  page: number;
  hasNext: boolean;
  next: () => void;
  first: () => void;
}) {
  const { t } = useUI();
  if (page === 1 && !hasNext) return null;
  return (
    <div className="pagination">
      <Button
        type="button"
        className="button-ghost"
        disabled={page === 1}
        onClick={first}
      >
        <ChevronRight size={16} />
        {t("البداية", "First")}
      </Button>
      <span>
        {t("صفحة", "Page")} {page}
      </span>
      <Button
        type="button"
        className="button-ghost"
        disabled={!hasNext}
        onClick={next}
      >
        {t("التالي", "Next")}
        <ChevronLeft size={16} />
      </Button>
    </div>
  );
}
export function Confirm({
  title,
  children,
  onConfirm,
}: {
  title: string;
  children: ReactNode;
  onConfirm: () => Promise<unknown>;
}) {
  const { t } = useUI(),
    [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        <Dialog.Content className="dialog-content">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>
            {t(
              "راجع العملية قبل تأكيدها.",
              "Review this action before confirming.",
            )}
          </Dialog.Description>
          {error && <Notice error>{error}</Notice>}
          <div className="button-row">
            <Button
              disabled={busy}
              className="button-danger"
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                  setOpen(false);
                } catch (e) {
                  setError(message(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Check size={17} />
              {t("تأكيد", "Confirm")}
            </Button>
            <Dialog.Close asChild>
              <Button className="button-ghost">
                <X size={17} />
                {t("إلغاء", "Cancel")}
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Back() {
  const { t } = useUI();
  return (
    <Link className="back-link" to="/">
      <ArrowLeft size={17} />
      {t("الرجوع للكتالوج", "Back to catalog")}
    </Link>
  );
}
export function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}
export function useAction() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  return {
    busy,
    error,
    success,
    run: async (fn: () => Promise<unknown>, done: string) => {
      setBusy(true);
      setError("");
      setSuccess("");
      try {
        await fn();
        setSuccess(done);
        return true;
      } catch (e) {
        setError(message(e));
        return false;
      } finally {
        setBusy(false);
      }
    },
  };
}
