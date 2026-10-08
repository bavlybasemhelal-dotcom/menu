import { useState } from "react";
import { Search } from "lucide-react";
import { useList, useDocument } from "../../integrations/firebase/hooks";
import { shopId } from "../../integrations/firebase/client";
import { useUI } from "../../app/context";
import { localize, normalizeSearch } from "../products/logic";
import type { Product } from "../products/models";
import { Notice, Pagination } from "../../components/ui";
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
