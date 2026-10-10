import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Upload, RefreshCw, X, Unplug, Trash2 } from "lucide-react";
import { useUI } from "../../app/context";
import {
  Button,
  Confirm,
  MediaImage,
  Notice,
  Pagination,
  useAction,
} from "../../components/ui";
import { shopId } from "../../integrations/firebase/client";
import { useDocument, useList } from "../../integrations/firebase/hooks";
import {
  recoverMedia,
  removeContent,
  reserveMediaRevoke,
  saveMedia,
  strip,
} from "../../integrations/firebase/repository";
import { normalizeConfig } from "../../integrations/drive/config";
import {
  storageList,
  storageReady,
  storageRevoke,
} from "../../integrations/drive/storage";
import {
  mediaData,
  uploadImage,
  verifyImage,
  type PendingImage,
  type ImageProgress,
} from "../../integrations/drive/image-upload";
import { forgetPublicImage } from "../../integrations/drive/image-cache";
import type { MediaFolder } from "../../integrations/drive/apps-script";
import type { DriveFile } from "../../integrations/drive/client";
import type { Media, PrivateConfig } from "../products/models";
import { isDriveAssetUrl } from "../../utils/urls";
const folderLabels: Partial<Record<MediaFolder, string>> = {
  products: "Products",
  branding: "Branding",
  offers: "Offers & Banners",
};
export default function ImageField({
  value,
  onChange,
  max = 6,
  folder = "products",
  label,
  onBusyChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  max?: number;
  folder?: MediaFolder;
  label?: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { t } = useUI(),
    config = useDocument<PrivateConfig>("privateShopConfig/" + shopId),
    a = useAction();
  const settings = normalizeConfig(config.data),
    ready = storageReady(settings);
  const [pending, setPending] = useState<PendingImage | null>(null),
    [keepOriginal, setKeepOriginal] = useState(false),
    [progress, setProgress] = useState<ImageProgress | null>(null),
    [preview, setPreview] = useState(""),
    [recovered, setRecovered] = useState<DriveFile[]>([]),
    [limited, setLimited] = useState(false),
    [showExisting, setShowExisting] = useState(false);
  const controller = useRef<AbortController | null>(null),
    input = useRef<HTMLInputElement>(null),
    alive = useRef(true);
  const list = useList("media", {
    admin: true,
    pageSize: 12,
    enabled: showExisting,
  });
  const valueRef = useRef(value);
  valueRef.current = value;
  const notifyBusy = useRef(onBusyChange),
    workActive = useRef(false);
  notifyBusy.current = onBusyChange;
  async function run(fn: () => Promise<unknown>, done: string) {
    if (workActive.current) return false;
    workActive.current = true;
    notifyBusy.current?.(true);
    try {
      return await a.run(fn, done);
    } finally {
      workActive.current = false;
      if (alive.current) notifyBusy.current?.(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      controller.current?.abort();
      notifyBusy.current?.(false);
    };
  }, []);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  function attach(id: string) {
    if (!alive.current) return;
    onChange(
      max === 1 ? [id] : [...new Set([...valueRef.current, id])].slice(0, max),
    );
    setPending(null);
    setPreview("");
  }
  async function retry() {
    if (!pending) return;
    setProgress((value) => (value ? { ...value, stage: "verifying" } : null));
    controller.current = new AbortController();
    const id = pending.id || (await recoverMedia(pending.data));
    setPending({ ...pending, id });
    attach(
      await verifyImage(settings, pending.data, id, controller.current.signal),
    );
    setProgress((value) => (value ? { ...value, stage: "ready" } : null));
  }
  return (
    <div className="image-field">
      <div className="image-field-toolbar">
        <Button
          type="button"
          onClick={() => input.current?.click()}
          disabled={!ready || a.busy || (max > 1 && value.length >= max)}
        >
          <Upload size={16} />
          {max === 1 && value.length
            ? t("استبدال الصورة", "Replace image")
            : t("إضافة صورة", "Add image")}
        </Button>
        <input
          ref={input}
          className="visually-hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          aria-label={label || t("رفع صورة هنا", "Upload image here")}
          disabled={!ready || a.busy || (max > 1 && value.length >= max)}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setPending(null);
            setProgress(null);
            setPreview(URL.createObjectURL(file));
            controller.current = new AbortController();
            void run(
              async () =>
                attach(
                  await uploadImage(
                    settings,
                    file,
                    folder,
                    (p) => {
                      if (alive.current) setPending(p);
                    },
                    controller.current!.signal,
                    {
                      keepOriginal,
                      onProgress: (value) => {
                        if (alive.current) setProgress(value);
                      },
                    },
                  ),
                ),
              t(
                "الصورة جاهزة؛ احفظ البيانات لإظهارها في الكتالوج",
                "Image ready; save changes to update the catalog",
              ),
            );
          }}
        />
        <small>
          {value.length}/{max} · {t("صورة", "images")}
        </small>
      </div>
      <small>
        {t(
          "نضغط صور JPEG وPNG وWebP تلقائيًا قبل الرفع لتسريع العرض. صور GIF تحتفظ بالحركة. تُشارك نسخة العرض فقط بعد اختبارها بدون تسجيل دخول.",
          "JPEG, PNG and WebP images are automatically compressed before upload for faster display. GIF animation is preserved. Only the display copy is shared and verified anonymously.",
        )}
      </small>
      <label className="image-original-option">
        <input
          type="checkbox"
          checked={keepOriginal}
          disabled={a.busy}
          onChange={(e) => setKeepOriginal(e.target.checked)}
        />
        {t(
          "احتفظ بنسخة أصلية خاصة أيضًا (رفع إضافي)",
          "Also keep a private original (additional upload)",
        )}
      </label>
      {progress && (
        <div className="image-upload-status" role="status" aria-live="polite">
          <span>
            {a.error
              ? t(
                  "العملية لم تكتمل؛ يمكنك إعادة المحاولة",
                  "Operation incomplete; you can retry",
                )
              : t(
                  {
                    compressing: "جارٍ ضغط الصورة…",
                    original: "جارٍ رفع الأصل الخاص…",
                    uploading: "جارٍ رفع صورة العرض…",
                    verifying: "جارٍ التحقق من ظهور الصورة…",
                    ready: "الصورة جاهزة",
                  }[progress.stage],
                  {
                    compressing: "Compressing image…",
                    original: "Uploading private original…",
                    uploading: "Uploading display image…",
                    verifying: "Verifying image display…",
                    ready: "Image ready",
                  }[progress.stage],
                )}
          </span>
          {progress.displayBytes !== undefined && (
            <small>
              {t("الحجم", "Size")}: {Math.ceil(progress.originalBytes / 1024)}{" "}
              KB → {Math.ceil(progress.displayBytes / 1024)} KB
              {progress.displayBytes < progress.originalBytes &&
                ` · ${t("توفير", "saved")} ${Math.round((1 - progress.displayBytes / progress.originalBytes) * 100)}%`}
            </small>
          )}
        </div>
      )}
      {!ready && (
        <Notice>
          <Link to="/admin/drive">
            {t(
              "فعّل واختبر ربط Google Drive لرفع الصور",
              "Set up and test Google Drive to upload images",
            )}
          </Link>
        </Notice>
      )}
      <div className="inline-image-grid">
        {value.map((id) => (
          <AttachedImage
            key={id}
            id={id}
            disabled={a.busy}
            onRemove={() => onChange(value.filter((v) => v !== id))}
            onRepair={async (m) => {
              await run(
                async () => {
                  await verifyImage(
                    settings,
                    strip(m) as PendingImage["data"],
                    m.id,
                  );
                },
                t("تم إصلاح عرض الصورة", "Image display repaired"),
              );
            }}
          />
        ))}
        {preview && (
          <div className="inline-image-card">
            <div className="media-image">
              <img
                src={preview}
                alt={t("معاينة الصورة المختارة", "Selected image preview")}
              />
            </div>
            <small>
              {a.busy
                ? t("جارٍ الرفع والتحقق…", "Uploading and verifying…")
                : t(
                    "لم يكتمل التحقق؛ الصورة لم تُضف بعد",
                    "Verification incomplete; image not attached yet",
                  )}
            </small>
          </div>
        )}
      </div>
      {a.busy && (
        <div className="button-row">
          <progress className="progress" />
          <Button
            type="button"
            className="button-ghost"
            onClick={() => controller.current?.abort()}
          >
            {t("إلغاء الرفع", "Cancel upload")}
          </Button>
        </div>
      )}
      {a.error && <Notice error>{a.error}</Notice>}
      {a.success && <Notice>{a.success}</Notice>}
      {pending && !a.busy && (
        <Button
          type="button"
          className="button-ghost"
          onClick={() =>
            run(
              retry,
              t("الصورة جاهزة؛ احفظ البيانات", "Image ready; save changes"),
            )
          }
        >
          <RefreshCw size={15} />
          {t(
            "إكمال حفظ واختبار الصورة بدون إعادة رفع",
            "Retry saving and verification without uploading again",
          )}
        </Button>
      )}
      <details
        className="image-field-details"
        onToggle={(e) => setShowExisting(e.currentTarget.open)}
      >
        <summary>
          {t(
            "الصور السابقة واستعادة رفع غير مكتمل",
            "Previous images and upload recovery",
          )}
        </summary>
        {showExisting && (
          <>
            {list.error && <Notice error>{list.error}</Notice>}
            <div className="media-selector-list">
              {list.data
                .filter(
                  (m) =>
                    m.mimeType.startsWith("image/") &&
                    !m.driveFolderName?.includes("Private Originals") &&
                    (!m.driveFolderName ||
                      m.driveFolderName.includes(folderLabels[folder] || "")),
                )
                .map((m) => (
                  <div className="inline-media-row" key={m.id}>
                    <span>{m.name}</span>
                    <Button
                      type="button"
                      className="button-ghost"
                      aria-label={
                        m.name +
                        " · " +
                        (m.status === "public_test_passed"
                          ? t("متحقق", "Verified")
                          : t("غير متحقق", "Unverified"))
                      }
                      disabled={
                        a.busy ||
                        (!ready && m.status !== "public_test_passed") ||
                        (max > 1 && value.length >= max)
                      }
                      onClick={() =>
                        run(
                          async () => {
                            if (
                              m.status === "public_test_passed" &&
                              m.publicShared &&
                              m.verifiedPublicAssetUrl &&
                              isDriveAssetUrl(m.verifiedPublicAssetUrl)
                            )
                              attach(m.id);
                            else
                              attach(
                                await verifyImage(
                                  settings,
                                  strip(m) as PendingImage["data"],
                                  m.id,
                                ),
                              );
                          },
                          t(
                            "تم اختيار الصورة؛ احفظ البيانات",
                            "Image selected; save changes",
                          ),
                        )
                      }
                    >
                      {m.status === "public_test_passed"
                        ? t("استخدام الصورة", "Use image")
                        : t("استخدام وفحص الصورة", "Use and verify image")}
                    </Button>
                    <UnusedImageActions
                      media={m}
                      settings={settings}
                      disabled={a.busy}
                    />
                  </div>
                ))}
            </div>
            <Pagination {...list} />
            <Button
              type="button"
              className="button-ghost"
              disabled={a.busy || !ready}
              onClick={() =>
                run(async () => {
                  const result = await storageList(settings);
                  setRecovered(
                    result.files.filter(
                      (f) =>
                        f.mimeType.startsWith("image/") &&
                        !f.folderName?.includes("Private Originals") &&
                        f.folderName?.includes(folderLabels[folder] || ""),
                    ),
                  );
                  setLimited(result.truncated);
                }, "")
              }
            >
              <RefreshCw size={15} />
              {t(
                "استعادة صور من مجلد هذا القسم في Drive",
                "Recover images from this section's Drive folder",
              )}
            </Button>
            {limited && (
              <small>
                {t(
                  "الفحص محدود بـ 100 ملف؛ افتح Drive للملفات الأخرى",
                  "Scan limited to 100 files; open Drive for other files",
                )}
              </small>
            )}
            {recovered.map((f) => (
              <div className="inline-media-row" key={f.id}>
                <span>{f.name}</span>
                <Button
                  type="button"
                  className="button-ghost"
                  disabled={a.busy || (max > 1 && value.length >= max)}
                  onClick={() =>
                    run(
                      async () => {
                        const data = mediaData(f);
                        const id = await recoverMedia(data);
                        setPending({ data, id });
                        attach(await verifyImage(settings, data, id));
                      },
                      t(
                        "تمت استعادة الصورة؛ احفظ البيانات",
                        "Image recovered; save changes",
                      ),
                    )
                  }
                >
                  {t("استعادة واستخدام الصورة", "Recover and use image")}
                </Button>
              </div>
            ))}
          </>
        )}
      </details>
    </div>
  );
}
export function useImageWork() {
  const [busy, setBusy] = useState(false),
    active = useRef(false);
  const set = useCallback((value: boolean) => {
    active.current = value;
    setBusy(value);
  }, []);
  return { busy, set, isBusy: () => active.current };
}
function AttachedImage({
  id,
  disabled,
  onRemove,
  onRepair,
}: {
  id: string;
  disabled: boolean;
  onRemove: () => void;
  onRepair: (m: Media) => Promise<void>;
}) {
  const { t } = useUI(),
    { data } = useDocument<Media>("shops/" + shopId + "/media/" + id);
  return (
    <div className="inline-image-card">
      <MediaImage
        id={id}
        revision={data?.updatedAt}
        alt={data?.name || t("صورة", "Image")}
      />
      <small>{data?.name || "…"}</small>
      <div className="button-row">
        <Button
          type="button"
          className="button-ghost"
          disabled={disabled}
          onClick={onRemove}
        >
          <X size={14} />
          {t("إزالة الصورة", "Remove image")}
        </Button>
        {data && (
          <Button
            type="button"
            className="button-ghost"
            disabled={disabled}
            onClick={() => onRepair(data)}
          >
            <RefreshCw size={14} />
            {t("إصلاح العرض", "Repair display")}
          </Button>
        )}
      </div>
    </div>
  );
}
function UnusedImageActions({
  media,
  settings,
  disabled,
}: {
  media: Media;
  settings: PrivateConfig;
  disabled: boolean;
}) {
  const { t } = useUI();
  return (
    <>
      <Confirm
        title={t(
          "إلغاء مشاركة الصورة غير المستخدمة؟",
          "Revoke sharing for this unused image?",
        )}
        onConfirm={async () => {
          await storageRevoke(settings, await reserveMediaRevoke(media.id));
          if (media.verifiedPublicAssetUrl)
            forgetPublicImage(media.verifiedPublicAssetUrl);
          await saveMedia(
            {
              ...(strip(media) as PendingImage["data"]),
              status: "private",
              publicShared: false,
              verifiedPublicAssetUrl: null,
              anonymousRenderTestedAt: null,
            },
            media.id,
          );
        }}
      >
        <Button
          type="button"
          className="button-ghost"
          disabled={
            disabled || !!media.usedBy.length || !storageReady(settings)
          }
          aria-label={t("إلغاء المشاركة", "Revoke sharing")}
        >
          <Unplug size={15} />
        </Button>
      </Confirm>
      <Confirm
        title={t(
          "حذف سجل الصورة غير المستخدمة؟ الملف يبقى في Drive.",
          "Delete unused image metadata? File stays in Drive.",
        )}
        onConfirm={() => removeContent("media", media.id)}
      >
        <Button
          type="button"
          className="button-ghost"
          disabled={disabled || !!media.usedBy.length}
          aria-label={t("حذف سجل الصورة", "Delete image metadata")}
        >
          <Trash2 size={15} />
        </Button>
      </Confirm>
    </>
  );
}
