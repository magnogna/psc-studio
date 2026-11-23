import { useEffect, useState, useSyncExternalStore } from "react";
import { del, get, set } from "idb-keyval";
import { parseDsf2, writeDsf2, type Dsf2File, type Dsf2Section } from "./container";
import { parseSectionXml, serializeSectionXml } from "./xml";

interface State {
  file: Dsf2File | null;
  dirty: Set<number>;
  version: number;
}

const DRAFT_KEY = "dsf2-draft";
let state: State = { file: null, dirty: new Set(), version: 0 };
const docs = new Map<number, Element>();
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | undefined;

function emit(persist = true) {
  state = { ...state, version: state.version + 1 };
  listeners.forEach((l) => l());
  if (persist) {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => void saveDraft(), 600);
  }
}

export function useDoc() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
    () => state,
  );
}

export function loadFile(buf: ArrayBuffer | Uint8Array, name: string) {
  const file = parseDsf2(buf, name);
  docs.clear();
  state = { file, dirty: new Set(), version: state.version + 1 };
  emit();
  return file;
}

export function closeFile() {
  docs.clear();
  state = { file: null, dirty: new Set(), version: state.version + 1 };
  listeners.forEach((l) => l());
  void del(DRAFT_KEY);
}

export function sectionByTag(tag: string): Dsf2Section | undefined {
  return state.file?.sections.find((s) => s.rootTag === tag);
}

export function getDoc(id: number): Element | null {
  const sec = state.file?.sections.find((s) => s.id === id);
  if (!sec || sec.kind !== "xml" || !sec.originalXml) return null;
  let el = docs.get(id);
  if (!el) {
    el = parseSectionXml(sec.originalXml);
    docs.set(id, el);
  }
  return el;
}

/** Applica una modifica a un elemento della sezione e segna la sezione come modificata. */
export function mutate(id: number, fn: () => void) {
  fn();
  state.dirty.add(id);
  emit();
}

function currentChanges() {
  const changes = new Map<number, string>();
  for (const id of state.dirty) {
    const el = docs.get(id);
    if (el) changes.set(id, serializeSectionXml(el));
  }
  return changes;
}

export function exportFile(): Uint8Array {
  if (!state.file) throw new Error("Nessun documento aperto");
  const out = writeDsf2(state.file, currentChanges());
  // verifica: il file ricostruito deve riaprirsi
  parseDsf2(out);
  return out;
}

async function saveDraft() {
  if (typeof indexedDB === "undefined") return;
  if (!state.file) return;
  const changes = Object.fromEntries(currentChanges());
  await set(DRAFT_KEY, { name: state.file.name, raw: state.file.raw, changes, at: Date.now() });
}

export async function readDraftInfo(): Promise<{ name: string; at: number } | null> {
  const d = await get(DRAFT_KEY);
  return d ? { name: d.name, at: d.at } : null;
}

export async function restoreDraft() {
  const d = await get(DRAFT_KEY);
  if (!d) return false;
  const file = parseDsf2(d.raw, d.name);
  docs.clear();
  const dirty = new Set<number>();
  for (const [k, xml] of Object.entries(d.changes as Record<string, string>)) {
    const id = Number(k);
    docs.set(id, parseSectionXml(xml));
    dirty.add(id);
  }
  state = { file, dirty, version: state.version + 1 };
  emit(false);
  return true;
}

export function downloadBytes(bytes: Uint8Array, name: string) {
  const blob = new Blob([bytes as BlobPart], { type: "application/octet-stream" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/** Riapre automaticamente l'ultima bozza se la pagina viene ricaricata. */
export function useAutoRestore() {
  const s = useDoc();
  const [tried, setTried] = useState(false);
  useEffect(() => {
    if (s.file || tried) return;
    void restoreDraft().finally(() => setTried(true));
  }, [s.file, tried]);
  return { ...s, ready: !!s.file || tried };
}
