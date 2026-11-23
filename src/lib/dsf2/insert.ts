import { get, set } from "idb-keyval";
import { parseDsf2, type Dsf2File } from "./container";
import { parseSectionXml } from "./xml";
import { getDoc, mutate, sectionByTag } from "./store";

export interface ArchiveFileRec { id: string; name: string; raw: Uint8Array; addedAt: number }
const KEY = "certus-archive-files";

export async function listArchiveFiles(): Promise<ArchiveFileRec[]> {
  return ((await get(KEY)) as ArchiveFileRec[] | undefined) ?? [];
}
export async function addArchiveFile(name: string, raw: Uint8Array) {
  parseDsf2(raw, name); // valida
  const all = (await listArchiveFiles()).filter((f) => f.name !== name);
  all.push({ id: crypto.randomUUID(), name, raw, addedAt: Date.now() });
  await set(KEY, all);
}
export async function removeArchiveFile(id: string) {
  await set(KEY, (await listArchiveFiles()).filter((f) => f.id !== id));
}

export interface ArchiveSource { file: Dsf2File; roots: Map<string, Element> }

export function openArchive(rec: ArchiveFileRec): ArchiveSource {
  const file = parseDsf2(rec.raw, rec.name);
  return { file, roots: new Map() };
}

export function archiveRoot(src: ArchiveSource, tag: string): Element | null {
  let r = src.roots.get(tag);
  if (!r) {
    const sec = src.file.sections.find((s) => s.rootTag === tag);
    if (!sec?.originalXml) return null;
    r = parseSectionXml(sec.originalXml);
    src.roots.set(tag, r);
  }
  return r;
}

/** Sezioni che possono contenere figli collegati (fase › lavoratori › attrezzi › rischi › misure). */
const LINKED = ["CollectionLavorazioni", "CollectionLavoratori", "CollectionMacchine", "CollectionAttrezzi", "CollectionRischi", "CollectionPrevenzioni", "CollectionSegnaletica", "CollectionLvCoord"];

const items = (root: Element) => Array.from(root.firstElementChild?.children ?? []).filter((e) => e.tagName.startsWith("Item"));

/**
 * Copia un elemento dell'archivio (con tutti i suoi figli, anche nelle altre sezioni collegate)
 * nel documento aperto, assegnando nuovi identificativi.
 */
export function insertFromArchive(src: ArchiveSource, tag: string, el: Element): number {
  const tags = LINKED.includes(tag) ? LINKED : [tag];
  // indice archivio: "TpPrnt:IdPrnt" -> elementi figli
  const children = new Map<string, { tag: string; el: Element }[]>();
  for (const t of tags) {
    const r = archiveRoot(src, t);
    if (!r) continue;
    for (const it of items(r)) {
      const k = `${it.getAttribute("TpPrnt")}:${it.getAttribute("IdPrnt")}`;
      if (it.getAttribute("TpPrnt") === "0") continue;
      const list = children.get(k) ?? [];
      list.push({ tag: t, el: it });
      children.set(k, list);
    }
  }
  // stato dei target
  const targets = new Map<string, { id: number; coll: Element; next: number }>();
  const target = (t: string) => {
    let x = targets.get(t);
    if (x) return x;
    const sec = sectionByTag(t);
    const root = sec ? getDoc(sec.id) : null;
    const coll = root?.firstElementChild;
    if (!sec || !coll) return null;
    let max = Number(coll.getAttribute("CountId") ?? 0);
    for (const it of Array.from(coll.children)) max = Math.max(max, Number(it.getAttribute("IdND") ?? 0));
    x = { id: sec.id, coll, next: max + 1 };
    targets.set(t, x);
    return x;
  };

  const main = target(tag);
  if (!main) throw new Error("Il documento aperto non ha questa sezione.");
  const rootItem = Array.from(main.coll.children).find((e) => e.getAttribute("IsRoot") === "true");
  let count = 0;
  const touched = new Set<number>();

  const copy = (t: string, srcEl: Element, parentId: string, parentTp: string) => {
    const tg = target(t);
    if (!tg) return;
    const clone = tg.coll.ownerDocument.importNode(srcEl, true) as Element;
    const newId = String(tg.next++);
    clone.setAttribute("IdND", newId);
    clone.setAttribute("IdPrnt", parentId);
    clone.setAttribute("TpPrnt", parentTp);
    clone.setAttribute("IsRoot", "false");
    tg.coll.appendChild(tg.coll.ownerDocument.createTextNode("\t\t"));
    tg.coll.appendChild(clone);
    tg.coll.appendChild(tg.coll.ownerDocument.createTextNode("\r\n"));
    tg.coll.setAttribute("CountId", String(tg.next));
    touched.add(tg.id);
    count++;
    const kids = children.get(`${srcEl.getAttribute("Tp")}:${srcEl.getAttribute("IdND")}`) ?? [];
    for (const k of kids) copy(k.tag, k.el, newId, srcEl.getAttribute("Tp") ?? "0");
  };

  copy(tag, el, rootItem?.getAttribute("IdND") ?? "1", rootItem ? rootItem.getAttribute("Tp") ?? "0" : "0");
  for (const id of touched) mutate(id, () => {});
  return count;
}

/** Figli diretti (stessa sezione) di un elemento dell'archivio, per la navigazione ad albero. */
export function archiveChildren(root: Element, parent: Element | null): Element[] {
  const all = items(root);
  if (!parent) {
    const r = all.find((e) => e.getAttribute("IsRoot") === "true");
    if (!r) return all;
    return all.filter((e) => e.getAttribute("IdPrnt") === r.getAttribute("IdND") && e.getAttribute("TpPrnt") === r.getAttribute("Tp") && e !== r);
  }
  return all.filter((e) => e.getAttribute("IdPrnt") === parent.getAttribute("IdND") && e.getAttribute("TpPrnt") === parent.getAttribute("Tp"));
}
