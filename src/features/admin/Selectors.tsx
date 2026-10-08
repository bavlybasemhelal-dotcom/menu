import { useState } from "react";
import { Check, Search } from "lucide-react";
import { useList, useDocument } from "../../integrations/firebase/hooks";
import { shopId } from "../../integrations/firebase/client";
import { useUI } from "../../app/context";
import { localize, normalizeSearch } from "../products/logic";
import type { Product } from "../products/models";
import { Button, Notice, Pagination } from "../../components/ui";
export function MediaPicker({
  value,
  onChange,
  max = 6,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  max?: number;
}) {
  const { language, t } = useUI(),
    list = useList("media", { admin: true, pageSize: 12 });
  return (
    <div className="media-selector">
      <p className="scroll-note">
        {t(
          "اختر صورًا من مكتبة الوسائط. النشر يحتاج اجتياز اختبار الزائر.",
          "Select images from the media library. Publishing requires a visitor test.",
        )}
      </p>
      {list.error && <Notice error>{list.error}</Notice>}
      <div className="media-selector-list">
        {list.data
          .filter((m) => m.mimeType.startsWith("image/"))
          .map((m) => (
            <button
              type="button"
              key={m.id}
              className={value.includes(m.id) ? "selected" : ""}
              onClick={() =>
                onChange(
                  value.includes(m.id)
                    ? value.filter((id) => id !== m.id)
                    : max === 1
                      ? [m.id]
                      : [...value, m.id].slice(0, max),
                )
              }
            >
              {value.includes(m.id) && <Check size={14} />} {m.name} ·{" "}
              {m.status === "public_test_passed"
                ? t("متحقق", "Verified")
                : t("غير متحقق", "Unverified")}
            </button>
          ))}
      </div>
      {value.length > 0 && (
        <div className="button-row" style={{ marginTop: 12 }}>
          {value.map((id) => (
            <Button
              type="button"
              className="button-ghost"
              key={id}
              onClick={() => onChange(value.filter((v) => v !== id))}
            >
              {t("إزالة", "Remove")} · {id.slice(0, 7)}
            </Button>
          ))}
        </div>
      )}
      {!list.data.length && (
        <small>
          {t(
            "ارفع الوسائط أولاً من صفحة الوسائط",
            "Upload files on the Media page first",
          )}
        </small>
      )}
      <Pagination {...list} />
      <span hidden>{language}</span>
    </div>
  );
}
export function ProductLabel({ id }: { id: string }) {
  const { language } = useUI(),
    { data } = useDocument<Product>("shops/" + shopId + "/products/" + id);
  return <>{data ? localize(data.name, language) : id}</>;
}
export function ProductPicker({ onPick }: { onPick: (id: string) => void }) {
  const { language, t } = useUI(),
    [text, setText] = useState(""),
    list = useList("products", {
      admin: true,
      search: normalizeSearch(text),
      pageSize: 12,
    });
  return (
    <div className="media-selector">
      <div className="search-bar">
        <Search size={18} />
        <input
          placeholder={t("ابحث لاختيار منتج", "Search to select a product")}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>
      {list.error && <Notice error>{list.error}</Notice>}
      <div className="media-selector-list">
        {list.data.map((p) => (
          <button type="button" key={p.id} onClick={() => onPick(p.id)}>
            {localize(p.name, language)} · {p.status}
          </button>
        ))}
      </div>
      <Pagination {...list} />
    </div>
  );
}
