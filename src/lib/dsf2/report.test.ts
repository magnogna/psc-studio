import { describe, expect, it } from "vitest";
import { buildGraph, TP, title } from "./report";

const xml = `<w><ItemLavorazione Titolo="Fase A" IdND="2" IdPrnt="1" TpPrnt="31" Tp="31" IsRoot="false"/>
<ItemLavoratore Titolo="LAVORATORI" IdND="1" IdPrnt="2" TpPrnt="31" Tp="32" IsRoot="true"/>
<ItemLavoratore Titolo="Addetto" IdND="4" IdPrnt="1" TpPrnt="32" Tp="32" IsRoot="false"/>
<ItemRischio Titolo="Rumore" IdND="9" IdPrnt="4" TpPrnt="32" Tp="12" IsRoot="false"/></w>`;

describe("report graph", () => {
  it("salta i contenitori radice e collega lavoratori e rischi", () => {
    const root = new DOMParser().parseFromString(xml, "application/xml").documentElement;
    const g = buildGraph([root]);
    const fase = root.querySelector("ItemLavorazione")!;
    const lav = g.kids(fase, TP.lavoratore);
    expect(lav.map(title)).toEqual(["Addetto"]);
    expect(g.kids(lav[0]!, TP.rischio).map(title)).toEqual(["Rumore"]);
  });
});

describe("note di compilazione", () => {
  it("rimuove i testi tra $CANCELLARE$", async () => {
    const { stripHints } = await import("./report");
    expect(stripHints("$CANCELLARE$\nnota\n$CANCELLARE$\nPronto Soccorso tel. 118")).toBe("Pronto Soccorso tel. 118");
  });
});
