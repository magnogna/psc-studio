import { get, set } from "idb-keyval";

export type ArchiveKind = "impresa" | "persona" | "fase";
export interface ArchiveEntry {
  id: string;
  kind: ArchiveKind;
  name: string;
  fields: Record<string, string>;
  createdAt: number;
}
const KEY = "certus-archive";

export async function listArchive(): Promise<ArchiveEntry[]> {
  return ((await get(KEY)) as ArchiveEntry[] | undefined) ?? [];
}
export async function addToArchive(e: Omit<ArchiveEntry, "id" | "createdAt">) {
  const all = await listArchive();
  all.unshift({ ...e, id: crypto.randomUUID(), createdAt: Date.now() });
  await set(KEY, all);
}
export async function removeFromArchive(id: string) {
  await set(KEY, (await listArchive()).filter((e) => e.id !== id));
}
export async function updateArchive(entry: ArchiveEntry) {
  await set(KEY, (await listArchive()).map((e) => (e.id === entry.id ? entry : e)));
}

export const KIND_FOR_TAG: Record<string, ArchiveKind> = {
  ItemCommittenti: "persona",
  ItemResponsabili: "persona",
  ItemImpresa: "impresa",
  ItemLavorazione: "fase",
};
export const KIND_LABEL: Record<ArchiveKind, string> = { impresa: "Imprese", persona: "Persone e committenti", fase: "Fasi di lavoro" };
