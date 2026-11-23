import { getDoc, sectionByTag } from "./store";

export interface RiskRow { el: Element; title: string; parent: string; path: string[]; p: number; e: number }

const PARENT_TAGS = ["CollectionLavorazioni", "CollectionLavoratori", "CollectionAttrezzi", "CollectionMacchine", "AreaCantiere", "CollectionOrganizCnt"];

/** Elenca i rischi valutabili con il percorso (fase › lavoratore › attrezzo). */
export function riskRows(): { id: number; rows: RiskRow[] } | null {
  const sec = sectionByTag("CollectionRischi");
  if (!sec) return null;
  const root = getDoc(sec.id);
  if (!root) return null;
  const index = new Map<string, Element>();
  for (const t of PARENT_TAGS) {
    const s = sectionByTag(t);
    const r = s ? getDoc(s.id) : null;
    r?.querySelectorAll("[IdND][Tp]").forEach((el) => {
      if (el.tagName.startsWith("Item")) index.set(`${el.getAttribute("Tp")}:${el.getAttribute("IdND")}`, el);
    });
  }
  const pathOf = (tp: string | null, id: string | null) => {
    const out: string[] = [];
    let el = index.get(`${tp}:${id}`);
    let guard = 0;
    while (el && guard++ < 8) {
      if (el.getAttribute("IsRoot") !== "true") out.unshift(el.getAttribute("Titolo") ?? "");
      el = index.get(`${el.getAttribute("TpPrnt")}:${el.getAttribute("IdPrnt")}`);
    }
    return out.filter((t) => t && t.toUpperCase() !== t);
  };
  const rows = Array.from(root.querySelectorAll("ItemRischio"))
    .filter((el) => el.getAttribute("IsRoot") !== "true" && el.getAttribute("TpPrnt") !== "0")
    .map((el) => {
      const path = pathOf(el.getAttribute("TpPrnt"), el.getAttribute("IdPrnt"));
      return { el, title: el.getAttribute("Titolo") ?? "", parent: path[0] ?? "", path, p: Number(el.getAttribute("DannoPro") ?? 0), e: Number(el.getAttribute("DannoEnt") ?? 0) };
    });
  return { id: sec.id, rows };
}
