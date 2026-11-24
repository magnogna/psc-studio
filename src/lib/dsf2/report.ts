import { isRtf, rtfToText } from "./rtf";

/** Grafo degli elementi del PSC collegati via (TpPrnt, IdPrnt), usato per comporre la stampa come CerTus. */
export const TP = { lavorazione: 31, lavoratore: 32, macchina: 33, attrezzo: 34, rischio: 12, prevenzione: 13, segnaletica: 14, coord: 35 } as const;

export interface Graph { kids: (el: Element, tp?: number) => Element[] }

export function text(el: Element | null | undefined, ...attrs: string[]): string {
  if (!el) return "";
  for (const a of attrs.length ? attrs : ["RTF", "RTFPos"]) {
    const v = el.getAttribute(a);
    if (v && isRtf(v)) { const t = stripHints(rtfToText(v)); if (t) return t; }
    else if (v && a !== "RTF" && a !== "RTFPos") return v;
  }
  return "";
}
/** CerTus non stampa le note di compilazione racchiuse tra $CANCELLARE$. */
export const stripHints = (s: string) => s.replace(/\$CANCELLARE\$[\s\S]*?\$CANCELLARE\$/g, "").replace(/\n{3,}/g, "\n\n").trim();
export const title = (el: Element) => (el.getAttribute("Titolo") ?? "").trim();
const ord = (a: Element, b: Element) => Number(a.getAttribute("IdOrdine") ?? 0) - Number(b.getAttribute("IdOrdine") ?? 0);

export function buildGraph(roots: Element[]): Graph {
  const children = new Map<string, Element[]>();
  for (const r of roots) r.querySelectorAll("*").forEach((el) => {
    if (!el.tagName.startsWith("Item")) return;
    const tp = el.getAttribute("TpPrnt"), id = el.getAttribute("IdPrnt");
    if (!tp || tp === "0") return;
    const k = `${tp}:${id}`;
    const l = children.get(k) ?? []; l.push(el); children.set(k, l);
  });
  const kids = (el: Element, tp?: number): Element[] => {
    const own = children.get(`${el.getAttribute("Tp")}:${el.getAttribute("IdND")}`) ?? [];
    const out: Element[] = [];
    for (const c of [...own].sort(ord)) {
      if (c === el) continue;
      if (c.getAttribute("IsRoot") === "true") out.push(...kids(c, tp));
      else if (tp === undefined || Number(c.getAttribute("Tp")) === tp) out.push(c);
    }
    return out;
  };
  return { kids };
}

/** Elenco unico per titolo, conservando l'ordine. */
export function uniq<T>(list: T[], key: (t: T) => string): T[] {
  const seen = new Set<string>();
  return list.filter((x) => { const k = key(x); if (seen.has(k)) return false; seen.add(k); return true; });
}
export const alpha = (a: Element, b: Element) => title(a).localeCompare(title(b), "it");
