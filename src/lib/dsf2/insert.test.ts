import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadFile, getDoc, sectionByTag, exportFile } from "./store";
import { archiveChildren, archiveRoot, insertFromArchive } from "./insert";
import { parseDsf2 } from "./container";

const raw = new Uint8Array(readFileSync(path.resolve(__dirname, "../../test/fixtures/sample.dsf2")));

describe("inserimento da archivio", () => {
  it("copia una fase con i figli collegati e il file si riapre", () => {
    // usa lo stesso PSC come archivio
    loadFile(raw, "a.dsf2");
    const src = { file: parseDsf2(raw), roots: new Map<string, Element>() };
    const root = archiveRoot(src, "CollectionLavorazioni")!;
    const folders = archiveChildren(root, null);
    const phase = archiveChildren(root, folders[0]!)[0]!;
    const before = getDoc(sectionByTag("CollectionLavorazioni")!.id)!.querySelectorAll("CollectionLavorazioni > ItemLavorazione").length;
    const n = insertFromArchive(src, "CollectionLavorazioni", phase);
    expect(n).toBeGreaterThan(1);
    const after = getDoc(sectionByTag("CollectionLavorazioni")!.id)!.querySelectorAll("CollectionLavorazioni > ItemLavorazione").length;
    expect(after).toBe(before + 1);
    const out = exportFile();
    const g = parseDsf2(out);
    expect(g.sections.find((s) => s.rootTag === "CollectionLavorazioni")!.originalXml).toContain(phase.getAttribute("Titolo")!);
  });
});
