import { useState, useRef } from "react";
import {
  CheckCircle,
  Share2,
  Unplug,
  Trash2,
  RefreshCw,
  FileVideo,
  FileText,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useUI } from "../../app/context";
import { useDocument, useList } from "../../integrations/firebase/hooks";
import { shopId } from "../../integrations/firebase/client";
import {
  saveMedia,
  removeContent,
  reserveMediaRevoke,
  recoverMedia,
} from "../../integrations/firebase/repository";
import {
  testAnonymousImage,
  type DriveFile,
} from "../../integrations/drive/client";
import type { Media, PrivateConfig } from "../products/models";
import {
  Button,
  Confirm,
  Field,
  Loading,
  MediaImage,
  Notice,
  PageTitle,
  Panel,
  Pagination,
  useAction,
} from "../../components/ui";
import { normalizeConfig } from "../../integrations/drive/config";
import {
  storageReady,
  canManageMedia,
  storageUpload,
  storageShare,
  storageRevoke,
  storageList,
  mediaCandidate,
} from "../../integrations/drive/storage";
import type { MediaFolder } from "../../integrations/drive/apps-script";
import { presentationFile } from "../../integrations/drive/presentation";
import {
  resolveFileMime,
  mediaAccept,
} from "../../integrations/drive/file-types";
function mediaData(
  file: DriveFile,
): Omit<Media, "id" | "createdAt" | "updatedAt"> {
  return {
    name: file.name.slice(0, 200),
    driveFileId: file.id,
    resourceKey: file.resourceKey || null,
    driveWebViewUrl:
      file.webViewLink ||
      "https://drive.google.com/file/d/" + file.id + "/view",
    verifiedPublicAssetUrl: null,
    mimeType: file.mimeType,
    sizeBytes: Number(file.size || 0),
    role: file.mimeType.startsWith("image/")
      ? "image"
      : file.mimeType.startsWith("video/")
        ? "video"
        : "document",
    status: "metadata_saved",
    publicShared: false,
    anonymousRenderTestedAt: null,
    usedBy: [],
    publicUsedBy: [],
    storageProvider: "apps_script",
    ...(file.directUrl
      ? {
          driveDirectUrl: file.directUrl,
          driveDownloadUrl: file.downloadUrl || "",
          driveFolderId: file.folderId || "",
          driveFolderName: file.folderName || "",
        }
      : {}),
  };
}
export default function MediaLibrary() {
  const { t } = useUI(),
    config = useDocument<PrivateConfig>("privateShopConfig/" + shopId),
    list = useList("media", { admin: true, pageSize: 12 }),
    [optimize, setOptimize] = useState(true),
    [folder, setFolder] = useState<MediaFolder>("products"),
    [recoveryLimited, setRecoveryLimited] = useState(false),
    [pending, setPending] = useState<DriveFile | null>(null),
    [pendingOriginal, setPendingOriginal] = useState<string | null>(null),
    [recovered, setRecovered] = useState<DriveFile[]>([]),
    controller = useRef<AbortController | null>(null),
    a = useAction();
  const settings = normalizeConfig(config.data);
  async function upload(file: File) {
    const mimeType = resolveFileMime(file);
    if (file.type !== mimeType)
      file = new File([file], file.name, {
        type: mimeType,
        lastModified: file.lastModified,
      });
    const max = file.type.startsWith("image/")
      ? settings.maxImageBytes
      : file.type.startsWith("video/")
        ? settings.maxVideoBytes
        : settings.maxDocumentBytes;
    if (!max || file.size > max)
      throw Error(
        t(
          "حجم الملف أكبر من الحد أو رفع النوع معطل. عدّل إعدادات Drive.",
          "File exceeds the size limit or this type is disabled. Update Drive settings.",
        ),
      );
    controller.current = new AbortController();
    const result = await storageUpload(
      settings,
      file,
      optimize && file.type.startsWith("image/") && file.type !== "image/gif"
        ? "originals"
        : folder,
      controller.current.signal,
    );
    setPending(result);
    setPendingOriginal(null);
    const originalId = await saveMedia(mediaData(result));
    setPending(null);
    if (
      optimize &&
      file.type.startsWith("image/") &&
      file.type !== "image/gif"
    ) {
      const display = await presentationFile(file);
      if (display.size > settings.maxImageBytes)
        throw Error(
          t(
            "نسخة العرض أكبر من الحد المسموح",
            "Display file exceeds the image limit",
          ),
        );
      const optimized = await storageUpload(
        settings,
        display,
        folder,
        controller.current.signal,
      );
      setPending(optimized);
      setPendingOriginal(originalId);
      await saveMedia({ ...mediaData(optimized), originalMediaId: originalId });
      setPending(null);
    }
  }
  return (
    <>
      <PageTitle
        title={t("مكتبة الوسائط", "Media library")}
        subtitle={t(
          "الملفات في حساب Drive، والروابط والبيانات فقط في Firestore",
          "Files stay in Drive; links and metadata stay in Firestore",
        )}
        action={
          <Link to="/admin/drive" className="button button-ghost">
            {t("إعداد Drive", "Drive setup")}
          </Link>
        }
      />
      <Notice>
        {t(
          "الملف يُرفع خاصًا أولاً. المشاركة واختبار الزائر خطوات منفصلة قبل استخدام الصورة في محتوى منشور.",
          "Uploads start private. Sharing and visitor verification are separate steps before published use.",
        )}
      </Notice>
      <Panel title={t("رفع ملف جديد", "Upload a file")}>
        <Field label={t("مجلد تنظيم الملف", "File organization folder")}>
          <select
            value={folder}
            onChange={(e) => setFolder(e.target.value as MediaFolder)}
            disabled={a.busy}
          >
            <option value="products">{t("المنتجات", "Products")}</option>
            <option value="offers">
              {t("العروض والبنرات", "Offers and banners")}
            </option>
            <option value="branding">
              {t("الهوية والشعار", "Branding and logo")}
            </option>
            <option value="documents">{t("المستندات", "Documents")}</option>
            <option value="videos">{t("الفيديوهات", "Videos")}</option>
          </select>
        </Field>
        <label className="check-field">
          <input
            type="checkbox"
            checked={optimize}
            onChange={(e) => setOptimize(e.target.checked)}
          />
          {t(
            "حفظ الأصل الخاص ورفع نسخة WebP للعرض (حتى 1600px)",
            "Keep a private original and upload a display WebP (up to 1600px)",
          )}
        </label>
        <Field
          label={t(
            "اختر صورة أو فيديو أو ملف",
            "Choose image, video or document",
          )}
          hint="JPEG · PNG · WebP · GIF · MP4 · WebM · PDF · DOC/DOCX · XLS/XLSX · TXT"
        >
          <input
            type="file"
            accept={mediaAccept}
            disabled={a.busy || !storageReady(settings)}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file)
                void a.run(
                  () => upload(file),
                  t(
                    "تم الرفع وحفظ البيانات؛ لم يُختبر عرض الزائر بعد",
                    "Uploaded and metadata saved; visitor access is not verified yet",
                  ),
                );
              e.target.value = "";
            }}
          />
        </Field>
        {a.busy && (
          <>
            <progress className="progress" max={100} />
            <small>
              {t(
                "جاري إرسال الملف ومعالجته في Drive…",
                "Sending and processing the file in Drive…",
              )}
            </small>
            <Button
              className="button-ghost"
              onClick={() => controller.current?.abort()}
            >
              {t("إلغاء الرفع", "Cancel upload")}
            </Button>
          </>
        )}
        {!storageReady(settings) && (
          <small>
            {t(
              "افتح إعداد Drive واختبر الربط أولاً",
              "Open Drive setup and test the connection first",
            )}
          </small>
        )}
        {pending && (
          <Notice error>
            {t(
              "تم الرفع إلى Drive لكن حفظ البيانات لم يكتمل. أعد المحاولة.",
              "Drive upload succeeded but metadata save did not. Retry.",
            )}
            <Button
              disabled={a.busy}
              onClick={() =>
                a.run(
                  async () => {
                    await saveMedia({
                      ...mediaData(pending),
                      originalMediaId: pendingOriginal,
                    });
                    setPending(null);
                  },
                  t("تم حفظ البيانات", "Metadata saved"),
                )
              }
            >
              <RefreshCw size={16} />
              {t("إعادة الحفظ", "Retry save")}
            </Button>
          </Notice>
        )}
        {a.error && <Notice error>{a.error}</Notice>}
        {a.success && <Notice>{a.success}</Notice>}
      </Panel>
      <Panel title={t("الملفات المسجلة", "Saved media")}>
        {list.error && <Notice error>{list.error}</Notice>}
        {list.loading ? (
          <Loading />
        ) : (
          <div className="media-grid">
            {list.data.map((m) => (
              <MediaItem key={m.id} media={m} settings={settings} />
            ))}
          </div>
        )}
        <Pagination {...list} />
      </Panel>
      <Panel
        title={t(
          "استعادة ملفات الرفع غير المكتمل",
          "Recover incomplete uploads",
        )}
        subtitle={t(
          "ابحث في مجلد التطبيق عن ملف رُفع ولم تُحفظ بياناته. تحقق أنه غير مسجل قبل إضافته.",
          "Find files uploaded to the app folder whose metadata was not saved. Check for existing records before adding.",
        )}
      >
        <Button
          className="button-ghost"
          disabled={a.busy || !storageReady(settings)}
          onClick={() =>
            a.run(async () => {
              const result = await storageList(settings);
              setRecovered(result.files);
              setRecoveryLimited(result.truncated);
            }, "")
          }
        >
          <RefreshCw size={17} />
          {t("فحص مجلد التطبيق", "Inspect app folder")}
        </Button>
        {recoveryLimited && (
          <small>
            {t(
              "هذه نتيجة محدودة حتى 100 ملف. للملفات الأخرى افتح مجلد Drive مباشرة.",
              "This listing is limited to 100 files. Open Drive directly for other files.",
            )}
          </small>
        )}
        {recovered.map((f) => (
          <div className="button-row" key={f.id} style={{ marginTop: 12 }}>
            <span>{f.name}</span>
            <Button
              className="button-ghost"
              onClick={() =>
                a.run(
                  () => recoverMedia(mediaData(f)),
                  t(
                    "تم العثور على السجل أو استعادة بيانات الملف غير المنشور",
                    "Existing record found or unpublished metadata recovered",
                  ),
                )
              }
            >
              {t("استعادة البيانات", "Recover metadata")}
            </Button>
          </div>
        ))}
      </Panel>
    </>
  );
}
function MediaItem({
  media: m,
  settings,
}: {
  media: Media;
  settings: PrivateConfig;
}) {
  const { t } = useUI(),
    a = useAction(),
    [incognito, setIncognito] = useState(false);
  const manageable = canManageMedia(settings, m);
  const candidate = mediaCandidate(m);
  const data = () => {
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = m;
    void _id;
    void _c;
    void _u;
    return rest;
  };
  return (
    <div className="media-card">
      {m.mimeType.startsWith("image/") ? (
        <MediaImage id={m.id} alt={m.name} />
      ) : (
        <div className="media-image">
          {m.role === "video" ? (
            <FileVideo size={36} />
          ) : (
            <FileText size={36} />
          )}
        </div>
      )}
      <h3>{m.name}</h3>
      <small>
        {(m.sizeBytes / 1048576).toFixed(2)} MB · {m.usedBy.length}{" "}
        {t("استخدام", "uses")}
      </small>
      {m.driveFolderName && <small>{m.driveFolderName}</small>}
      {!manageable && (
        <small>
          {t(
            "إدارة هذا الملف تحتاج تفعيل واختبار طريقة ربطه الأصلية من إعداد Drive.",
            "To manage this file, activate and test its original connection method in Drive setup.",
          )}
        </small>
      )}
      <span
        className={
          "badge " + (m.status === "public_test_passed" ? "" : "badge-warning")
        }
      >
        {m.status === "public_test_passed"
          ? t("عرض الزائر متحقق", "Visitor access verified")
          : m.publicShared
            ? t("مشارك — غير متحقق", "Shared — unverified")
            : t("خاص — غير متحقق", "Private — unverified")}
      </span>
      {a.error && <Notice error>{a.error}</Notice>}
      {a.success && <Notice>{a.success}</Notice>}
      <div className="button-row" style={{ marginTop: 14 }}>
        <Button
          disabled={
            a.busy ||
            m.publicShared ||
            !manageable ||
            !!m.driveFolderName?.includes("Private Originals")
          }
          className="button-ghost"
          onClick={() =>
            a.run(
              async () => {
                await storageShare(settings, m.driveFileId);
                await saveMedia({ ...data(), publicShared: true }, m.id);
              },
              t(
                "تمت مشاركة الملف المحدد فقط؛ الاختبار لم يكتمل",
                "Only this file is shared; verification is incomplete",
              ),
            )
          }
        >
          <Share2 size={15} />
          {t("مشاركة هذا الملف", "Share this file")}
        </Button>
        {m.publicShared && m.mimeType.startsWith("image/") && (
          <>
            <a
              className="text-button"
              href={candidate || undefined}
              target="_blank"
              rel="noreferrer"
            >
              {t("افتح الرابط في نافذة متخفية", "Open this link incognito")}
            </a>
            <label className="check-field">
              <input
                type="checkbox"
                checked={incognito}
                onChange={(e) => setIncognito(e.target.checked)}
              />
              {t(
                "رأيت الصورة في نافذة متخفية بدون دخول",
                "I saw the image incognito without signing in",
              )}
            </label>
            <Button
              disabled={a.busy || !candidate || !incognito}
              onClick={() =>
                a.run(
                  async () => {
                    const url = candidate!;
                    await testAnonymousImage(url);
                    await saveMedia(
                      {
                        ...data(),
                        status: "public_test_passed",
                        verifiedPublicAssetUrl: url,
                        anonymousRenderTestedAt: Date.now(),
                      },
                      m.id,
                    );
                  },
                  t(
                    "نجح جلب وفك ترميز الصورة بدون توكن",
                    "Tokenless image fetch and decode passed",
                  ),
                )
              }
            >
              <CheckCircle size={16} />
              {t("اختبار وحفظ نتيجة الصورة", "Test and record image")}
            </Button>
          </>
        )}
        {!m.mimeType.startsWith("image/") && (
          <a
            href={m.driveWebViewUrl}
            className="text-button"
            target="_blank"
            rel="noreferrer"
          >
            {t("فتح الملف في Drive", "Open file in Drive")}
          </a>
        )}
        <Confirm
          title={t(
            "إلغاء المشاركة؟ مسموح فقط للملف غير المستخدم.",
            "Revoke sharing? Allowed only for unused files.",
          )}
          onConfirm={async () => {
            const fileId = await reserveMediaRevoke(m.id);
            await storageRevoke(settings, fileId);
            await saveMedia(
              {
                ...data(),
                status: "private",
                publicShared: false,
                verifiedPublicAssetUrl: null,
                anonymousRenderTestedAt: null,
              },
              m.id,
            );
          }}
        >
          <Button
            className="button-ghost"
            disabled={!!m.usedBy.length || a.busy || !manageable}
          >
            <Unplug size={15} />
            {t("إلغاء المشاركة", "Revoke sharing")}
          </Button>
        </Confirm>
        <Confirm
          title={t(
            "حذف سجل الوسائط غير المستخدم؟ الملف يبقى في Drive.",
            "Delete unused metadata? The file stays in Drive.",
          )}
          onConfirm={() => removeContent("media", m.id)}
        >
          <Button className="button-ghost" disabled={!!m.usedBy.length}>
            <Trash2 size={15} />
            {t("حذف السجل", "Delete record")}
          </Button>
        </Confirm>
      </div>
    </div>
  );
}
