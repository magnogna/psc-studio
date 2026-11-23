import { deflate, inflate } from "pako";

/**
 * Lettore/scrittore del contenitore ACCA .dsf2 (ricostruito per analisi, non documentato).
 *
 * Struttura osservata:
 * - settori da 0x800 byte a partire dall'offset 0x138; ogni settore ha 2016 byte utili + 32 byte di coda
 * - un "settore indice" elenca (u32) i settori dati di una sezione, terminati da 0
 * - il primo settore dati inizia con "AACS"; a +0x80: clen, ulen, chk, clen+16; a +0x90 lo stream zlib
 */
export const SECTOR = 0x800;
export const BASE = 0x138;
export const PAYLOAD = 2016;
const DATA_OFF = 0x90;
const HDR_OFF = 0x80;
const TRAILER_MAGIC = 7844;
const CHUNK = 1 << 20;

/**
 * Segue la catena dei settori indice. Un indice contiene fino a 504 settori; quando è pieno
 * l'indice successivo è il settore (non dati) che inizia con il settore seguente all'ultimo elencato.
 */
function readChain(raw: Uint8Array, start: number, n: number, byFirst: () => Map<number, number[]>) {
  const sectors: number[] = [];
  const indexes: number[] = [];
  let cur: number | undefined = start;
  for (let guard = 0; guard < 64 && cur !== undefined; guard++) {
    if (indexes.includes(cur) || cur >= n || isAACS(raw, cur)) return null;
    indexes.push(cur);
    const o = BASE + cur * SECTOR;
    let count = 0;
    for (let k = 0; k < 504; k++) {
      const v = u32(raw, o + k * 4);
      if (v === 0) break;
      if (v >= n) return null;
      sectors.push(v);
      count++;
    }
    if (count < 504) break;
    const last = sectors[sectors.length - 1]!;
    cur = (byFirst().get(last + 1) ?? []).find((c) => !indexes.includes(c) && !isAACS(raw, c));
  }
  return sectors.length ? { sectors, indexes } : null;
}

export type SectionKind = "xml" | "binary";

export interface Dsf2Section {
  id: number; // primo settore indice
  sectors: number[];
  indexes: number[]; // catena dei settori indice
  checks: number[];
  kind: SectionKind;
  rootTag: string;
  title: string;
  capacity: number;
  originalXml?: string;
  bytes: Uint8Array;
}

export interface Dsf2File {
  name: string;
  raw: Uint8Array;
  sections: Dsf2Section[];
}

const u32 = (b: Uint8Array, off: number) =>
  (b[off]! | (b[off + 1]! << 8) | (b[off + 2]! << 16) | (b[off + 3]! << 24)) >>> 0;

function setU32(b: Uint8Array, off: number, v: number) {
  b[off] = v & 0xff;
  b[off + 1] = (v >>> 8) & 0xff;
  b[off + 2] = (v >>> 16) & 0xff;
  b[off + 3] = (v >>> 24) & 0xff;
}

const isAACS = (raw: Uint8Array, s: number) => {
  const o = BASE + s * SECTOR;
  return raw[o] === 0x41 && raw[o + 1] === 0x41 && raw[o + 2] === 0x43 && raw[o + 3] === 0x53;
};

export function isDsf2(raw: Uint8Array) {
  return new TextDecoder("latin1").decode(raw.subarray(0, 8)) === "AAMVHFSS";
}

function gather(raw: Uint8Array, sectors: number[]) {
  const out = new Uint8Array(sectors.length * PAYLOAD);
  sectors.forEach((s, i) => out.set(raw.subarray(BASE + s * SECTOR, BASE + s * SECTOR + PAYLOAD), i * PAYLOAD));
  return out;
}

const utf8 = new TextDecoder("utf-8");

function describe(text: string) {
  const m = /^\s*<([\w\-.]+)/.exec(text);
  const t = /Titolo="([^"]*)"/.exec(text.slice(0, 400));
  return { rootTag: m?.[1] ?? "", title: t?.[1]?.replace(/&apos;/g, "'").replace(/&amp;/g, "&") ?? "" };
}

export function parseDsf2(input: ArrayBuffer | Uint8Array, name = "documento.dsf2"): Dsf2File {
  const raw = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (!isDsf2(raw)) throw new Error("Il file non sembra un documento .dsf2 di CerTus.");
  const n = Math.floor((raw.length - BASE) / SECTOR);
  const sections: Dsf2Section[] = [];
  const used = new Set<number>();
  let firstMap: Map<number, number[]> | null = null;
  const byFirst = () => {
    if (!firstMap) {
      firstMap = new Map();
      for (let k = 0; k < n; k++) {
        const v = u32(raw, BASE + k * SECTOR);
        const list = firstMap.get(v) ?? [];
        list.push(k);
        firstMap.set(v, list);
      }
    }
    return firstMap;
  };

  for (let i = 0; i < n; i++) {
    if (isAACS(raw, i) || used.has(i)) continue;
    const o = BASE + i * SECTOR;
    const first = u32(raw, o);
    if (first === 0 || first >= n || !isAACS(raw, first)) continue;
    const chain = readChain(raw, i, n, byFirst);
    if (!chain) continue;
    const { sectors, indexes } = chain;
    const data = gather(raw, sectors);
    const chunks = Math.max(1, u32(data, 12));
    const parts: Uint8Array[] = [];
    const checks: number[] = [];
    let p = HDR_OFF;
    let ok = true;
    for (let c = 0; c < chunks; c++) {
      const clen = u32(data, p);
      const ulen = u32(data, p + 4);
      if (u32(data, p + 12) !== clen + 16 || p + 16 + clen > data.length) { ok = false; break; }
      checks.push(u32(data, p + 8));
      try {
        const part = inflate(data.subarray(p + 16, p + 16 + clen));
        if (part.length !== ulen) { ok = false; break; }
        parts.push(part);
      } catch { ok = false; break; }
      p += 16 + clen;
    }
    if (!ok) continue;
    const total = parts.reduce((t, x) => t + x.length, 0);
    const bytes = new Uint8Array(total);
    let q = 0;
    for (const x of parts) { bytes.set(x, q); q += x.length; }
    sectors.forEach((s) => used.add(s));
    indexes.forEach((s) => used.add(s));
    const head = utf8.decode(bytes.subarray(0, 64));
    const xml = /^\s*</.test(head) && !head.includes("\u0000");
    const text = xml ? utf8.decode(bytes) : "";
    const d = xml ? describe(text) : { rootTag: "", title: "" };
    sections.push({
      id: i,
      sectors,
      indexes,
      checks,
      kind: xml ? "xml" : "binary",
      rootTag: d.rootTag,
      title: d.title,
      capacity: sectors.length * PAYLOAD - DATA_OFF,
      ...(xml ? { originalXml: text } : {}),
      bytes,
    });
  }
  if (sections.length === 0) throw new Error("Nessuna sezione leggibile trovata nel file.");
  return { name, raw, sections };
}

export class CapacityError extends Error {
  constructor(public section: string, public need: number, public have: number) {
    super(`La sezione "${section}" è diventata troppo grande per lo spazio disponibile nel file (${need} su ${have} byte). Accorcia i testi.`);
  }
}

const BITMAP_OFF = 0x938;
const COUNT_OFF = 0x118 + 12 * 4;

/**
 * Ricostruisce il file sostituendo il contenuto XML delle sezioni modificate.
 * Se una sezione cresce oltre lo spazio allocato, aggiunge settori in coda al file
 * (aggiornando l'elenco della sezione, il conteggio settori e la mappa dello spazio libero).
 */
export function writeDsf2(file: Dsf2File, changes: Map<number, string>): Uint8Array {
  let out = new Uint8Array(file.raw);
  const enc = new TextEncoder();
  let nSectors = Math.floor((out.length - BASE) / SECTOR);
  const grow = (extra: number) => {
    const next = new Uint8Array(BASE + (nSectors + extra) * SECTOR);
    next.set(out.subarray(0, BASE + nSectors * SECTOR));
    out = next;
    const first = nSectors;
    nSectors += extra;
    setU32(out, COUNT_OFF, Math.max(u32(out, COUNT_OFF), nSectors + 1));
    for (let s = first; s < nSectors; s++) {
      for (const b of [s - 1, s, s + 1]) {
        const byte = BITMAP_OFF + (b >> 3);
        if (byte < BASE) out[byte] = out[byte]! & ~(1 << (b & 7));
      }
    }
    return Array.from({ length: extra }, (_, i) => first + i);
  };
  for (const [id, xml] of changes) {
    const sec = file.sections.find((s) => s.id === id);
    if (!sec || sec.kind !== "xml") continue;
    if (xml === sec.originalXml) continue;
    const plain = enc.encode(xml);
    const comps: Uint8Array[] = [];
    for (let p = 0; p < plain.length || p === 0; p += CHUNK) comps.push(deflate(plain.subarray(p, p + CHUNK), { level: 9 }));
    const bodyLen = comps.reduce((t, c) => t + 16 + c.length, 0);
    let sectors = [...sec.sectors];
    let indexes = [...sec.indexes];
    const need = Math.ceil((HDR_OFF + bodyLen) / PAYLOAD);
    if (need > sectors.length) {
      const trailer = out.slice(BASE + sectors[0]! * SECTOR + PAYLOAD, BASE + (sectors[0]! + 1) * SECTOR);
      const idxTrailer = out.slice(BASE + indexes.at(-1)! * SECTOR + 504 * 4, BASE + (indexes.at(-1)! + 1) * SECTOR);
      const extraData = need - sectors.length;
      const extraIdx = Math.max(0, Math.ceil(need / 504) - indexes.length);
      if (extraIdx > 0) throw new CapacityError(sec.title || sec.rootTag, need * PAYLOAD, indexes.length * 504 * PAYLOAD);
      const added = grow(extraData + extraIdx);
      const newIdx = added.slice(0, extraIdx);
      const newData = added.slice(extraIdx);
      for (const s of newData) out.set(trailer, BASE + s * SECTOR + PAYLOAD);
      for (const s of newIdx) { out.set(idxTrailer, BASE + s * SECTOR + 504 * 4); setU32(out, BASE + s * SECTOR + 504 * 4, TRAILER_MAGIC); }
      sectors = [...sectors, ...newData];
      const allIdx = [...indexes, ...newIdx];
      allIdx.forEach((ix, k) => {
        const o = BASE + ix * SECTOR;
        const list = sectors.slice(k * 504, (k + 1) * 504);
        for (let w = 0; w < 504; w++) setU32(out, o + w * 4, list[w] ?? 0);
        if (k < allIdx.length - 1) setU32(out, o + 504 * 4, allIdx[k + 1]!);
      });
      indexes = allIdx;
    }
    const data = gather(out, sectors);
    data.fill(0, HDR_OFF);
    setU32(data, 12, comps.length);
    let p = HDR_OFF;
    comps.forEach((c, k) => {
      const ulen = Math.min(CHUNK, plain.length - k * CHUNK);
      setU32(data, p, c.length);
      setU32(data, p + 4, ulen);
      setU32(data, p + 8, sec.checks[k] ?? 0);
      setU32(data, p + 12, c.length + 16);
      data.set(c, p + 16);
      p += 16 + c.length;
    });
    sectors.forEach((s, i) => out.set(data.subarray(i * PAYLOAD, (i + 1) * PAYLOAD), BASE + s * SECTOR));
  }
  return out;
}
