import { useEffect, useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { Save, ShieldCheck, Phone, Palette, Store } from "lucide-react";
import { useUI } from "../../app/context";
import { saveStore } from "../../integrations/firebase/repository";
import type { StorePublic } from "../products/models";
import {
  Bilingual,
  Button,
  Field,
  Notice,
  PageTitle,
  Panel,
  useAction,
  MediaImage,
} from "../../components/ui";
import { MediaPicker } from "./Selectors";
export default function Settings() {
  const { store, storeLoading, t } = useUI(),
    [value, setValue] = useState<StorePublic>(store),
    [dirty, setDirty] = useState(false),
    a = useAction();
  useEffect(() => {
    if (!dirty) setValue(store);
  }, [store, dirty]);
  function patch<K extends keyof StorePublic>(key: K, v: StorePublic[K]) {
    setDirty(true);
    setValue((old) => ({ ...old, [key]: v }));
  }
  return (
    <>
      <PageTitle
        title={t("إعدادات المحل", "Store settings")}
        subtitle={t(
          "هويتك، وسائل التواصل، وكل التفاصيل اللي يشوفها زوارك",
          "Your identity, contact details and visitor preferences",
        )}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void a.run(
            async () => {
              await saveStore(value);
              setDirty(false);
            },
            t("تم حفظ إعدادات المحل", "Store settings saved"),
          );
        }}
      >
        <Panel title={t("هوية المحل", "Store identity")}>
          <div className="eyebrow">
            <Store size={17} />
            {t(
              "اسمك وشعارك في كل الشاشات",
              "Your name and logo across every screen",
            )}
          </div>
          <Bilingual
            label={t("اسم المحل", "Store name")}
            value={value.name}
            onChange={(v) => patch("name", v)}
          />
          <Bilingual
            label={t("وصف المحل", "Store description")}
            multiline
            value={value.description}
            onChange={(v) => patch("description", v)}
          />
          <Field label={t("شعار المحل", "Store logo")}>
            <MediaPicker
              max={1}
              value={value.logoMediaId ? [value.logoMediaId] : []}
              onChange={(v) => patch("logoMediaId", v[0] || null)}
            />
          </Field>
          {value.logoMediaId && (
            <div style={{ width: 90 }}>
              <MediaImage
                id={value.logoMediaId}
                alt={t("معاينة الشعار", "Logo preview")}
              />
            </div>
          )}
        </Panel>
        <Panel title={t("التواصل واللغة", "Contact and language")}>
          <div className="eyebrow">
            <Phone size={17} />
            {t("تواصل مباشر مع الزائر", "Direct contact with visitors")}
          </div>
          <div className="form-grid">
            <Field
              label={t("رقم واتساب", "WhatsApp number")}
              hint={t(
                "بكود الدولة، أرقام فقط. مثال: 201xxxxxxxxx",
                "Country code and digits only. Example: 201xxxxxxxxx",
              )}
            >
              <input
                dir="ltr"
                value={value.whatsappNumber}
                onChange={(e) => patch("whatsappNumber", e.target.value)}
              />
            </Field>
            <Field label={t("رابط صفحة فيسبوك", "Facebook page URL")}>
              <input
                dir="ltr"
                type="url"
                value={value.facebookUrl}
                onChange={(e) => patch("facebookUrl", e.target.value)}
              />
            </Field>
            <Field label={t("العملة", "Currency")}>
              <select
                value={value.currency}
                onChange={(e) =>
                  patch("currency", e.target.value as StorePublic["currency"])
                }
              >
                {["EGP", "USD", "SAR", "AED", "EUR"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label={t("اللغة الافتراضية", "Default language")}>
              <select
                value={value.defaultLanguage}
                onChange={(e) =>
                  patch("defaultLanguage", e.target.value as "ar" | "en")
                }
              >
                <option value="ar">{t("العربية", "Arabic")}</option>
                <option value="en">{t("الإنجليزية", "English")}</option>
              </select>
            </Field>
          </div>
        </Panel>
        <Panel title={t("ألوان الهوية", "Brand colors")}>
          <div className="eyebrow">
            <Palette size={17} />
            {t("لمستك الخاصة في الكتالوج", "Your catalog’s personal touch")}
          </div>
          <div className="form-grid">
            <Field label={t("اللون الأساسي", "Primary color")}>
              <input
                type="color"
                value={value.branding.primary}
                onChange={(e) =>
                  patch("branding", {
                    ...value.branding,
                    primary: e.target.value,
                  })
                }
              />
            </Field>
            <Field label={t("لون العروض", "Accent color")}>
              <input
                type="color"
                value={value.branding.accent}
                onChange={(e) =>
                  patch("branding", {
                    ...value.branding,
                    accent: e.target.value,
                  })
                }
              />
            </Field>
          </div>
        </Panel>
        {a.error && <Notice error>{a.error}</Notice>}
        {a.success && <Notice>{a.success}</Notice>}
        <div className="save-bar">
          <small>
            {t(
              "الحفظ يحدّث واجهة الزائر مباشرة",
              "Saving updates the visitor immediately",
            )}
          </small>
          <Button disabled={a.busy || storeLoading}>
            <Save size={18} />
            {t("حفظ الإعدادات", "Save settings")}
          </Button>
        </div>
      </form>
      <AccountSettings />
    </>
  );
}
function AccountSettings() {
  const { user, t } = useUI(),
    [password, setPassword] = useState(""),
    [email, setEmail] = useState(""),
    [newPassword, setNewPassword] = useState(""),
    a = useAction();
  async function verify() {
    if (!user?.email) throw Error("Email account required");
    await reauthenticateWithCredential(
      user,
      EmailAuthProvider.credential(user.email, password),
    );
  }
  return (
    <Panel
      title={t("أمان حساب الإدارة", "Admin account security")}
      className="account-panel"
    >
      <div className="eyebrow">
        <ShieldCheck size={18} />
        {user?.email}
      </div>
      <Notice>
        {t(
          "تغيير الإيميل لا يغيّر UID المالك أو صلاحياته. إعداد Drive له حساب وربط منفصل.",
          "Changing email preserves the owner UID and permissions. Drive uses a separate account connection.",
        )}
      </Notice>
      <Field
        label={t("كلمة المرور الحالية للتحقق", "Current password to verify")}
      >
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <div className="form-grid">
        <Field label={t("الإيميل الجديد", "New email")}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </Field>
        <Field
          label={t("كلمة المرور الجديدة", "New password")}
          hint={t(
            "٦ أحرف على الأقل، واستخدم كلمة مرور قوية",
            "At least 6 characters; choose a strong password",
          )}
        >
          <input
            type="password"
            minLength={6}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Field>
      </div>
      {a.error && <Notice error>{a.error}</Notice>}
      {a.success && <Notice>{a.success}</Notice>}
      <div className="button-row">
        <Button
          disabled={a.busy || !password || !email}
          onClick={() =>
            a.run(
              async () => {
                await verify();
                await verifyBeforeUpdateEmail(user!, email);
                setPassword("");
                setEmail("");
              },
              t(
                "راجع رسالة التحقق على الإيميل الجديد لإتمام التغيير",
                "Open the verification email sent to the new address to complete the change",
              ),
            )
          }
        >
          {t("إرسال تحقق الإيميل الجديد", "Verify new email")}
        </Button>
        <Button
          className="button-ghost"
          disabled={a.busy || !password || newPassword.length < 6}
          onClick={() =>
            a.run(
              async () => {
                await verify();
                await updatePassword(user!, newPassword);
                setPassword("");
                setNewPassword("");
              },
              t("تم تغيير كلمة المرور", "Password changed"),
            )
          }
        >
          {t("تغيير كلمة المرور", "Change password")}
        </Button>
      </div>
    </Panel>
  );
}
