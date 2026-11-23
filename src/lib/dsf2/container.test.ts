import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseDsf2, writeDsf2 } from "./container";

const raw = new Uint8Array(readFileSync(path.resolve(__dirname, "../../test/fixtures/sample.dsf2")));

describe("dsf2 container", () => {
  it("reads all XML sections of the sample, including multi-sector ones", () => {
    const f = parseDsf2(raw);
    const tags = f.sections.map((s) => s.rootTag);
    expect(tags).toContain("CollectionComm");
    expect(tags).toContain("CollectionLavorazioni");
    expect(tags).toContain("CollectionRischi");
    expect(tags).toContain("GanttLavorazioni");
  });

  it("writes an edit and reads it back unchanged elsewhere", () => {
    const f = parseDsf2(raw);
    const comm = f.sections.find((s) => s.rootTag === "CollectionComm")!;
    const edited = comm.originalXml!.replace("Corso Novara 223/A", "Via Roma 1");
    const out = writeDsf2(f, new Map([[comm.id, edited]]));
    const g = parseDsf2(out);
    expect(g.sections.find((s) => s.id === comm.id)!.originalXml).toBe(edited);
    for (const s of f.sections) {
      if (s.id === comm.id) continue;
      expect(Buffer.compare(g.sections.find((x) => x.id === s.id)!.bytes, s.bytes)).toBe(0);
    }
  });

  it("grows a section beyond its allocated sectors and reads it back", () => {
    const f = parseDsf2(raw);
    const comm = f.sections.find((s) => s.rootTag === "CollectionComm")!;
    let noise = "";
    for (let i = 0; i < 4000; i++) noise += ((i * 7919) % 100003).toString(36);
    const edited = comm.originalXml!.replace('Fax=""', `Fax="${noise}"`);
    const out = writeDsf2(f, new Map([[comm.id, edited]]));
    expect(out.length).toBeGreaterThan(raw.length);
    const g = parseDsf2(out);
    expect(g.sections.find((s) => s.id === comm.id)!.originalXml).toBe(edited);
    expect(g.sections.length).toBe(f.sections.length);
  });
});

describe("archivi grandi (sezioni oltre 1 MB)", () => {
  it("legge per intero le lavorazioni di un archivio multi-blocco", () => {
    const p = "/mnt/user-uploads/ARCHIVIO_Fasi_Lavoro_PROG.dsf2";
    let buf: Uint8Array;
    try { buf = new Uint8Array(readFileSync(p)); } catch { return; }
    const f = parseDsf2(buf);
    const lav = f.sections.find((s) => s.rootTag === "CollectionLavorazioni")!;
    expect(lav.bytes.length).toBeGreaterThan(1048576);
    expect(lav.originalXml!.trimEnd().endsWith("</CollectionLavorazioni>")).toBe(true);
    const out = writeDsf2(f, new Map([[lav.id, lav.originalXml!.replace("LAVORAZIONI", "LAVORAZIONI ")]]));
    const g = parseDsf2(out);
    expect(g.sections.find((s) => s.id === lav.id)!.originalXml!.length).toBe(lav.originalXml!.length + 1);
  }, 120000);
});
