import { getDoc, sectionByTag } from "./store";

export interface GanttRow {
  lav: Element;
  task: Element | null;
  title: string;
  folder: boolean;
  depth: number;
  start: Date | null;
  days: number;
  color: string;
}

export function parseIt(d: string | null): Date | null {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d ?? "");
  if (!m) return null;
  return new Date(Date.UTC(Number(m[3]), Number(m[2]) - 1, Number(m[1])));
}
export function fmtIt(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
}
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);
export const diffDays = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);

export function ganttRows(): { id: number; rows: GanttRow[] } | null {
  const sec = sectionByTag("CollectionLavorazioni");
  if (!sec) return null;
  const root = getDoc(sec.id);
  if (!root) return null;
  const items = Array.from(root.querySelectorAll("CollectionLavorazioni > ItemLavorazione"));
  const byId = new Map(items.map((i) => [i.getAttribute("IdND"), i]));
  const depthOf = (el: Element): number => {
    let d = 0;
    let p = byId.get(el.getAttribute("IdPrnt"));
    while (p && p.getAttribute("IsRoot") !== "true" && d < 10) { d++; p = byId.get(p.getAttribute("IdPrnt")); }
    return d;
  };
  const rows: GanttRow[] = items
    .filter((i) => i.getAttribute("IsRoot") !== "true")
    .map((lav) => {
      const task = lav.querySelector(":scope > CollectionLvTaskGantt > ItemLvTaskGantt");
      return {
        lav,
        task,
        title: lav.getAttribute("Titolo") ?? "",
        folder: lav.getAttribute("IsCartella") === "true",
        depth: depthOf(lav),
        start: parseIt(task?.getAttribute("DtInizio") ?? null),
        days: Math.max(1, Number(task?.getAttribute("Durata") ?? 1) || 1),
        color: task?.getAttribute("Colore") || "",
      };
    });
  return { id: sec.id, rows };
}
