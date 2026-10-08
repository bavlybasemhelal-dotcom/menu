import { useRef, useState } from "react";
import {
  Button,
  Confirm,
  Field,
  Notice,
  Pagination,
  useAction,
} from "../../components/ui";
import { useUI } from "../../app/context";
import { useList } from "../../integrations/firebase/hooks";
import {
  recoverMedia,
  removeContent,
  reserveMediaRevoke,
  saveMedia,
  strip,
} from "../../integrations/firebase/repository";
import {
  resolveFileMime,
  mediaAccept,
} from "../../integrations/drive/file-types";
import { mediaData } from "../../integrations/drive/image-upload";
import {
  storageList,
  storageReady,
  storageShare,
  storageRevoke,
  storageUpload,
} from "../../integrations/drive/storage";
import type { DriveFile } from "../../integrations/drive/client";
import type { Media, PrivateConfig } from "../products/models";
export default function DriveFiles({ settings }: { settings: PrivateConfig }) {
  const { t } = useUI(),
    a = useAction(),
    list = useList("media", { admin: true, pageSize: 12 }),
    [pending, setPending] = useState<DriveFile | null>(null),
    [files, setFiles] = useState<DriveFile[]>([]),
    [limited, setLimited] = useState(false),
    locked = useRef(false);
  const ready = storageReady(settings);
  return (
    <div className="image-field">
      <p>
        {t(
          "صور المنتجات والشعار والأقسام والعروض تُرفع من محرراتها. هنا ملفات Drive الإدارية: المستندات والفيديوهات واستعادة بيانات الأصول الخاصة.",
          "Product, logo, category and offer images upload in their editors. Manage administrative documents, videos and private-original recovery here.",
        )}
      </p>
      <Field
        label={t(
          "رفع مستند أو فيديو إلى Drive",
          "Upload document or video to Drive",
        )}
      >
        <input
          type="file"
          accept={mediaAccept
            .split(",")
            .filter((v) => !/image|\.png|\.jpg|\.jpeg|\.webp|\.gif/.test(v))
            .join(",")}
          disabled={a.busy || !ready}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file || locked.current) return;
            locked.current = true;
            void a.run(
              async () => {
                try {
                  const mime = resolveFileMime(file);
                  if (mime.startsWith("image/"))
                    throw Error(
                      t(
                        "ارفع الصورة من مكان استخدامها",
                        "Upload images in their editor",
                      ),
                    );
                  const max = mime.startsWith("video/")
                    ? settings.maxVideoBytes
                    : settings.maxDocumentBytes;
                  if (!max || !file.size || file.size > max)
                    throw Error(
                      t(
                        "نوع الملف معطل أو حجمه يتجاوز الحد",
                        "Type disabled or file exceeds the limit",
                      ),
                    );
                  const result = await storageUpload(
                    settings,
                    new File([file], file.name, { type: mime }),
                    mime.startsWith("video/") ? "videos" : "documents",
                  );
                  setPending(result);
                  await recoverMedia(mediaData(result));
                  setPending(null);
                } finally {
                  locked.current = false;
                }
              },
              t(
                "تم حفظ الملف خاصًا في Drive وبياناته في Firestore",
                "Private file saved in Drive with metadata in Firestore",
              ),
            );
          }}
        />
      </Field>
      {a.error && <Notice error>{a.error}</Notice>}
      {a.success && <Notice>{a.success}</Notice>}
      {pending && (
        <Button
          type="button"
          className="button-ghost"
          disabled={a.busy}
          onClick={() =>
            a.run(
              async () => {
                await recoverMedia(mediaData(pending));
                setPending(null);
              },
              t("تم حفظ البيانات", "Metadata saved"),
            )
          }
        >
          {t(
            "إعادة حفظ البيانات بدون إعادة رفع",
            "Retry metadata without uploading again",
          )}
        </Button>
      )}
      {list.error && <Notice error>{list.error}</Notice>}
      {list.data
        .filter(
          (m) =>
            !m.mimeType.startsWith("image/") ||
            m.driveFolderName?.includes("Private Originals"),
        )
        .map((m) => (
          <DriveFileRow key={m.id} media={m} settings={settings} />
        ))}
      <Pagination {...list} />
      <Button
        type="button"
        className="button-ghost"
        disabled={a.busy || !ready}
        onClick={() =>
          a.run(async () => {
            const result = await storageList(settings);
            setFiles(
              result.files.filter(
                (f) =>
                  !f.mimeType.startsWith("image/") ||
                  f.folderName?.includes("Private Originals"),
              ),
            );
            setLimited(result.truncated);
          }, "")
        }
      >
        {t("فحص ملفات Drive غير المكتملة", "Inspect incomplete Drive files")}
      </Button>
      {limited && (
        <small>
          {t("الفحص محدود بـ 100 ملف", "Scan limited to 100 files")}
        </small>
      )}
      {files.map((f) => (
        <div className="inline-media-row" key={f.id}>
          <span>{f.name}</span>
          <Button
            type="button"
            className="button-ghost"
            disabled={a.busy}
            onClick={() =>
              a.run(
                () => recoverMedia(mediaData(f)),
                t(
                  "تم العثور على السجل أو استعادة بياناته",
                  "Record found or metadata recovered",
                ),
              )
            }
          >
            {t("استعادة البيانات", "Recover metadata")}
          </Button>
        </div>
      ))}
    </div>
  );
}
function DriveFileRow({
  media: m,
  settings,
}: {
  media: Media;
  settings: PrivateConfig;
}) {
  const { t } = useUI(),
    a = useAction(),
    data = strip(m) as Omit<Media, "id" | "createdAt" | "updatedAt">;
  return (
    <div className="inline-media-row">
      <span>
        {m.name}
        <small>
          {" "}
          ·{" "}
          {m.publicShared
            ? t(
                "مشارك برابط Drive؛ لم يُختبر عرضه",
                "Shared via Drive; viewing unverified",
              )
            : t("خاص", "Private")}
        </small>
      </span>
      <a href={m.driveWebViewUrl} target="_blank" rel="noreferrer">
        {t("فتح في Drive", "Open in Drive")}
      </a>
      {!m.driveFolderName?.includes("Private Originals") && (
        <Confirm
          title={t(
            "مشاركة هذا الملف فقط لمن لديه الرابط؟",
            "Share only this file with anyone who has its link?",
          )}
          onConfirm={async () => {
            await storageShare(settings, m.driveFileId);
            await saveMedia({ ...data, publicShared: true }, m.id);
          }}
        >
          <Button
            type="button"
            className="button-ghost"
            disabled={m.publicShared || !storageReady(settings)}
          >
            {t("مشاركة الملف", "Share file")}
          </Button>
        </Confirm>
      )}
      <Confirm
        title={t(
          "إلغاء مشاركة الملف غير المستخدم؟",
          "Revoke unused file sharing?",
        )}
        onConfirm={() =>
          a
            .run(async () => {
              await storageRevoke(settings, await reserveMediaRevoke(m.id));
              await saveMedia(
                {
                  ...data,
                  publicShared: false,
                  status: "private",
                  verifiedPublicAssetUrl: null,
                  anonymousRenderTestedAt: null,
                },
                m.id,
              );
            }, "")
            .then((ok) => {
              if (!ok)
                throw Error(
                  t(
                    "فشلت العملية؛ راجع الخطأ",
                    "Operation failed; check the error",
                  ),
                );
            })
        }
      >
        <Button
          type="button"
          className="button-ghost"
          disabled={!!m.usedBy.length || !storageReady(settings)}
        >
          {t("إلغاء المشاركة", "Revoke sharing")}
        </Button>
      </Confirm>
      <Confirm
        title={t(
          "حذف السجل غير المستخدم؟ الملف يبقى في Drive.",
          "Delete unused metadata? File stays in Drive.",
        )}
        onConfirm={() => removeContent("media", m.id)}
      >
        <Button
          type="button"
          className="button-ghost"
          disabled={!!m.usedBy.length}
        >
          {t("حذف السجل", "Delete metadata")}
        </Button>
      </Confirm>
      {a.error && <Notice error>{a.error}</Notice>}
    </div>
  );
}
