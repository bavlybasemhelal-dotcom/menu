import { useEffect, useState } from "react";
import {
  Copy,
  Download,
  ExternalLink,
  FolderSync,
  Save,
  Unplug,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useUI } from "../../app/context";
import { auth, shopId } from "../../integrations/firebase/client";
import { useDocument } from "../../integrations/firebase/hooks";
import { savePrivate } from "../../integrations/firebase/repository";
import { normalizeConfig } from "../../integrations/drive/config";
import {
  buildDriveScript,
  isScriptUrl,
  testScriptConnection,
} from "../../integrations/drive/apps-script";
import type { PrivateConfig } from "../products/models";
import DriveFiles from "./DriveFiles";
import {
  Button,
  Field,
  Loading,
  Notice,
  PageTitle,
  Panel,
  useAction,
} from "../../components/ui";
export default function DriveSetup() {
  const { t, store, language, user } = useUI();
  const loaded = useDocument<PrivateConfig>("privateShopConfig/" + shopId);
  const [value, setValue] = useState(normalizeConfig());
  const [showScript, setShowScript] = useState(false);
  const [showFiles, setShowFiles] = useState(false);
  const a = useAction();
  useEffect(() => {
    if (!loaded.loading) setValue(normalizeConfig(loaded.data));
  }, [loaded.data, loaded.loading]);
  if (loaded.loading) return <Loading />;
  const code = buildDriveScript({
    projectId: auth?.app.options.projectId || "",
    apiKey: auth?.app.options.apiKey || "",
    adminUid: user?.uid || "",
    rootFolderName:
      value.rootFolderName?.trim() ||
      store.name[language] ||
      store.name.ar ||
      store.name.en ||
      t("ملفات الكتالوج", "Catalog files"),
  });
  const resetConnection = (patch: Partial<PrivateConfig>) =>
    setValue({
      ...value,
      ...patch,
      scriptConnected: false,
      lastTestedAt: null,
      rootFolderId: "",
      storageUsedBytes: null,
    });
  async function testAndSave() {
    try {
      const result = await testScriptConnection(value.webAppUrl || "");
      const next = {
        ...value,
        ...result,
        scriptConnected: true,
        lastTestedAt: Date.now(),
      };
      await savePrivate(next);
      setValue(next);
    } catch (error) {
      const next = {
        ...value,
        scriptConnected: false,
        lastTestedAt: Date.now(),
        storageUsedBytes: null,
      };
      await savePrivate(next);
      setValue(next);
      throw error;
    }
  }
  return (
    <>
      <PageTitle
        title={t("إعداد Google Drive", "Google Drive setup")}
        subtitle={t(
          "اربط حساب Google لتخزين الصور والملفات من خلال رابط تطبيق الويب",
          "Connect your Google account to store media through a Web App URL",
        )}
      />
      {loaded.error && <Notice error>{loaded.error}</Notice>}
      <Notice>
        {value.scriptConnected
          ? t(
              "آخر اختبار اتصال نجح. كل عملية جديدة تتحقق من حساب الأدمن؛ عرض الصور للزائر يحتاج اختبارًا منفصلًا.",
              "The last connection test passed. Each new operation verifies the admin; visitor images need a separate test.",
            )
          : value.webAppUrl
            ? t(
                "اختبر الرابط المدخل واحفظه لإكمال الربط.",
                "Test and save the entered URL to complete setup.",
              )
            : t(
                "اربط حساب Drive باستخدام الدليل التالي.",
                "Connect your Drive account using the guide below.",
              )}
      </Notice>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void a.run(
            () => savePrivate(value),
            t("تم حفظ الإعدادات", "Settings saved"),
          );
        }}
      >
        <Panel title={t("إعدادات Google Drive", "Google Drive settings")}>
          <Field
            label={t(
              "البريد الإلكتروني لحساب Google (Gmail)",
              "Google account email (Gmail)",
            )}
            hint={t(
              "للتذكير فقط؛ الحساب الذي ينشر السكريبت هو صاحب مساحة Drive.",
              "For reference only; the script deployment account owns the Drive storage.",
            )}
          >
            <input
              type="email"
              dir="ltr"
              value={value.googleEmail || ""}
              onChange={(e) =>
                resetConnection({ googleEmail: e.target.value.trim() })
              }
            />
          </Field>
          <Field label={t("رابط تطبيق الويب (Web App URL)", "Web App URL")}>
            <input
              type="url"
              dir="ltr"
              value={value.webAppUrl || ""}
              onChange={(e) =>
                resetConnection({ webAppUrl: e.target.value.trim() })
              }
              placeholder="https://script.google.com/macros/s/…/exec"
            />
          </Field>
          <Field
            label={t("اسم المجلد الرئيسي", "Root folder name")}
            hint={t(
              "يُستخدم عند نسخ السكريبت وإنشاء المجلد أول مرة؛ تعديل الاسم هنا لا يعيد تسمية مجلد موجود.",
              "Used when copying the script and creating the folder for the first time; this field does not rename an existing folder.",
            )}
          >
            <input
              value={value.rootFolderName || ""}
              maxLength={200}
              onChange={(e) =>
                setValue({ ...value, rootFolderName: e.target.value })
              }
              placeholder={
                store.name[language] || t("ملفات الكتالوج", "Catalog files")
              }
            />
          </Field>
          <div className="button-row">
            <Button
              type="button"
              disabled={a.busy || !isScriptUrl(value.webAppUrl || "")}
              onClick={() =>
                a.run(
                  testAndSave,
                  t(
                    "تم الاتصال وحفظ الربط والمجلد؛ اختبار الصورة منفصل",
                    "Connected and saved the link and folder; image verification is separate",
                  ),
                )
              }
            >
              <FolderSync size={18} />
              {a.busy
                ? t("جاري الفحص والربط…", "Testing connection…")
                : t("اختبار وحفظ الربط", "Test and save connection")}
            </Button>
            <Button
              type="button"
              className="button-ghost"
              onClick={() => setShowScript((v) => !v)}
            >
              {t(
                "دليل الإعداد السريع وكود السكريبت",
                "Quick setup guide and script code",
              )}
            </Button>
            <Button
              type="button"
              className="button-ghost"
              disabled={a.busy || !value.webAppUrl}
              onClick={() =>
                a.run(
                  async () => {
                    const next = {
                      ...value,
                      webAppUrl: "",
                      scriptConnected: false,
                      lastTestedAt: null,
                      rootFolderId: "",
                      driveFolderId: "",
                      storageUsedBytes: null,
                    };
                    await savePrivate(next);
                    setValue(next);
                  },
                  t(
                    "تم فصل الرابط. لإيقاف السكريبت نفسه: Apps Script → Deploy → Manage deployments → Archive.",
                    "Link disconnected. To stop the script itself: Apps Script → Deploy → Manage deployments → Archive.",
                  ),
                )
              }
            >
              <Unplug size={17} />
              {t("فصل الربط", "Disconnect")}
            </Button>
          </div>
          {value.rootFolderId && (
            <p>
              <a
                href={
                  "https://drive.google.com/drive/folders/" +
                  encodeURIComponent(value.rootFolderId)
                }
                target="_blank"
                rel="noreferrer"
              >
                {t("فتح المجلد الرئيسي", "Open root folder")}{" "}
                <ExternalLink size={13} />
              </a>
            </p>
          )}
          {value.lastTestedAt && (
            <small>
              {t("آخر اختبار", "Last test")}:{" "}
              {new Date(value.lastTestedAt).toLocaleString(
                language === "ar" ? "ar-EG" : "en-GB",
                { timeZone: "Africa/Cairo" },
              )}
            </small>
          )}
          {value.storageUsedBytes != null && (
            <p className="scroll-note">
              {t(
                "مساحة Drive المستخدمة وقت الاختبار",
                "Drive storage used at the last test",
              )}
              : {(value.storageUsedBytes / 1048576).toFixed(2)} MB
            </p>
          )}
        </Panel>
        <Panel
          title={t("حدود رفع الملفات", "Upload size limits")}
          subtitle={t(
            "صفر يعطّل النوع. الحد الأقصى 20 MB للملف؛ اضغط الملفات أو قلّل حجم الفيديو قبل الرفع إذا تجاوز الحد.",
            "Zero disables a type. Each file is limited to 20 MB; compress files or reduce video size before upload if needed.",
          )}
        >
          <div className="form-grid">
            {(
              ["maxImageBytes", "maxVideoBytes", "maxDocumentBytes"] as const
            ).map((key, i) => (
              <Field
                key={key}
                label={t(
                  ["الصور — MB", "الفيديو — MB", "الملفات — MB"][i],
                  ["Images — MB", "Video — MB", "Documents — MB"][i],
                )}
              >
                <input
                  type="number"
                  min={0}
                  max={20}
                  step={0.5}
                  value={value[key] / 1048576}
                  onChange={(e) =>
                    setValue({
                      ...value,
                      [key]: Math.round(Number(e.target.value) * 1048576),
                    })
                  }
                />
              </Field>
            ))}
          </div>
        </Panel>
        <Button disabled={a.busy}>
          <Save size={18} />
          {t("حفظ إعدادات Drive", "Save Drive settings")}
        </Button>
      </form>
      <Panel title={t("الخطوات من البداية", "Start here")}>
        <div className="steps">
          <div className="step">
            <h3>
              {t(
                "١ · افتح حساب Google المطلوب",
                "1 · Open your Google account",
              )}
            </h3>
            <p>
              {t(
                "افتح Apps Script بحساب Google الذي سيخزن الصور والملفات، ثم New project. بيانات النصوص والروابط تظل في Firebase.",
                "Open Apps Script in the Google account that will store media, then choose New project. Text and links stay in Firebase.",
              )}
            </p>
            <a
              href="https://script.google.com/home/start"
              target="_blank"
              rel="noreferrer"
            >
              {t("فتح Google Apps Script", "Open Google Apps Script")}{" "}
              <ExternalLink size={13} />
            </a>
          </div>
          <div className="step">
            <h3>{t("٢ · انسخ السكريبت", "2 · Copy the script")}</h3>
            <p>
              {t(
                "احذف الكود الافتراضي في Code.gs والصق الكود المجهز هنا بالكامل، ثم احفظ. الكود يتضمن معرّفات Firebase وحساب الأدمن الحالي، بدون كلمة مرور أو أسرار.",
                "Replace the default Code.gs contents with the generated code below, then save. It includes Firebase identifiers and the current admin UID, without passwords or secrets.",
              )}
            </p>
            <Button
              className="button-ghost"
              onClick={() => setShowScript(true)}
            >
              {t("عرض الكود", "Show code")}
            </Button>
          </div>
          <div className="step">
            <h3>{t("٣ · انشر تطبيق ويب", "3 · Deploy a Web app")}</h3>
            <p>
              {t(
                "Deploy → New deployment → Select type → Web app. Execute as: Me، وWho has access: Anyone. وافق بنفسك على صلاحيات Google المطلوبة لحسابك، ثم انسخ Web App URL المنتهي بـ /exec. لا تستخدم /dev.",
                "Deploy → New deployment → Select type → Web app. Set Execute as to Me and Who has access to Anyone. Review and authorize Google permissions yourself, then copy the Web App URL ending in /exec. Do not use /dev.",
              )}
            </p>
            <p>
              {t(
                "طريقة DriveApp تطلب من Google صلاحية رؤية وتعديل وإنشاء وحذف كل ملفات Drive، والاتصال بخدمة خارجية للتحقق من Firebase. الكود يحصر عمليات الملفات في مجلد الكتالوج ولا يتضمن أمر حذف، لكن صلاحية Google نفسها أوسع؛ راجعها قبل الموافقة.",
                "DriveApp asks Google for access to see, edit, create and delete all Drive files, plus external requests for Firebase verification. This code restricts file operations to the catalog folder and has no delete action, but Google's permission is broader; review it before authorizing.",
              )}
            </p>
            <p>
              {t(
                "لو النشر فشل قبل التفويض: من المحرر اختر doGet ثم Run → Review permissions، وأكمل شاشة Google بنفسك، ثم أعد النشر. لو نافذة التفويض لم تظهر، افتح نفس مشروع السكريبت في متصفحك المعتاد وأكمل الخطوة هناك.",
                "If deployment fails before authorization, select doGet in the editor, then Run → Review permissions. Complete Google's screen yourself and retry deployment. If no authorization window opens, open the same script project in your usual browser and complete that step there.",
              )}
            </p>
          </div>
          <div className="step">
            <h3>{t("٤ · اختبر واحفظ", "4 · Test and save")}</h3>
            <p>
              {t(
                "الصق الرابط بالأعلى واختَر حدود الرفع، ثم اختبار وحفظ الربط. السكريبت يتحقق من حساب الأدمن وينشئ المجلد الرئيسي تلقائيًا داخل Drive الخاص بصاحب السكريبت. الحساب المسموح فقط يستطيع الرفع.",
                "Paste the URL above, select upload limits and test/save. The script verifies the allowlisted admin and creates the root folder in the deployment owner's Drive.",
              )}
            </p>
          </div>
          <div className="step">
            <h3>
              {t(
                "٥ · ارفع واختبر صورة الزائر",
                "5 · Upload and test a visitor image",
              )}
            </h3>
            <p>
              {t(
                "ارفع الصورة من مكانها مباشرة: المنتج أو الشعار أو القسم أو العرض أو البنر. الموقع يشارك نسخة العرض فقط ويتحقق من جلبها وفك ترميزها بدون دخول قبل إضافتها. احفظ البيانات، ثم راجع ظهورها في الكتالوج من نافذة متخفية. المجلد الرئيسي والأصول يظلان خاصين. يلزم سكريبت الإصدار 2 لعرض الصور داخل الموقع.",
                "Upload directly in the product, logo, category, offer or banner editor. The site shares only the display copy and verifies tokenless fetch and decoding before attaching it. Save changes and check the catalog incognito. The root and originals stay private. Script version 2 is required for images to render in the site.",
              )}
            </p>
            <Link to="/admin/products/new">
              {t("إضافة منتج وصورته", "Add a product and its image")}
            </Link>
          </div>
        </div>
      </Panel>
      {showScript && (
        <Panel title={t("كود السكريبت الجاهز للنسخ", "Ready-to-copy script")}>
          <div className="button-row">
            <Button
              onClick={() =>
                a.run(
                  () => navigator.clipboard.writeText(code),
                  t("تم نسخ السكريبت بالكامل", "Full script copied"),
                )
              }
            >
              <Copy size={17} />
              {t("نسخ السكريبت", "Copy script")}
            </Button>
            <Button
              className="button-ghost"
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob([code], { type: "text/javascript" }),
                );
                const link = document.createElement("a");
                link.href = url;
                link.download = "catalog-drive-Code.gs";
                link.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              <Download size={17} />
              {t("تحميل Code.gs", "Download Code.gs")}
            </Button>
          </div>
          <textarea
            aria-label={t("كود Google Apps Script", "Google Apps Script code")}
            className="script-code"
            dir="ltr"
            readOnly
            value={code}
            rows={16}
            onFocus={(e) => e.target.select()}
          />
        </Panel>
      )}
      <Panel
        title={t(
          "تغيير الحسابات وحل المشاكل",
          "Account changes and troubleshooting",
        )}
      >
        <p>
          {t(
            "لتغيير Gmail: انشر سكريبت جديدًا من الحساب الجديد واستبدل الرابط واختبره. تغيير الإيميل هنا وحده لا ينقل الملفات. تغيير إيميل الأدمن من إعدادات المحل → أمان الحساب يحافظ على UID. حساب أدمن جديد يحتاج تحديث قواعد Firestore وإعادة نسخ السكريبت ونشره.",
            "To change Gmail, deploy a script in the new account, replace the URL and test again. Editing the email alone does not transfer files. Changing the admin email under Store settings → Account security preserves UID. A new admin account needs updated Firestore Rules and a newly generated/deployed script.",
          )}
        </p>
        <p>
          {t(
            "بعد تعديل الكود: Deploy → Manage deployments → Edit → Version: New version → Deploy. لو رجعت صفحة HTML أو دخول راجع Anyone وMe و/exec. لو فشل تحقق Firebase راجع UID والمشروع وقيود المفتاح؛ مفتاح مقيد بمواقع الويب فقط قد يمنع طلب السكريبت. استخدم له مفتاحًا منفصلًا مقيدًا بـ Identity Toolkit API بدل إزالة قيود مفتاح الموقع.",
            "After code changes: Deploy → Manage deployments → Edit → Version: New version → Deploy. HTML/login responses require checking Anyone, Me and /exec. Firebase verification failures require checking UID, project and key restrictions. A website-only key can block script requests; use a separate Identity Toolkit API-restricted key rather than removing the website key's restrictions.",
          )}
        </p>
        <a
          href="https://developers.google.com/apps-script/guides/web"
          target="_blank"
          rel="noreferrer"
        >
          {t("دليل Google الرسمي للنشر", "Official Google deployment guide")}
        </a>
      </Panel>
      <Panel>
        <details onToggle={e => setShowFiles(e.currentTarget.open)}>
          <summary>{t("ملفات Drive الإدارية والأصول الخاصة", "Administrative Drive files and private originals")}</summary>
          {showFiles && <DriveFiles settings={normalizeConfig(loaded.data)} />}
        </details>
      </Panel>
      {a.error && <Notice error>{a.error}</Notice>}
      {a.success && <Notice>{a.success}</Notice>}
    </>
  );
}
