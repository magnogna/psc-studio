import type { ReactNode } from "react";
import { getDoc, sectionByTag } from "@/lib/dsf2/store";
import { alpha, buildGraph, text, title, TP, uniq, type Graph } from "@/lib/dsf2/report";

const NORM = (s: string) => `(${s} del D.Lgs. 81/2008 e s.m.i.)`;
const root = (tag: string) => { const s = sectionByTag(tag); return s ? getDoc(s.id) : null; };
const items = (tag: string, sel = "*") => Array.from(root(tag)?.querySelectorAll(sel) ?? []).filter((e) => e.tagName.startsWith("Item") && e.getAttribute("IsRoot") !== "true");
const allRootText = (tag: string, sel = "*") => Array.from(root(tag)?.querySelectorAll(sel) ?? []).filter((e) => e.tagName.startsWith("Item")).map((e) => text(e)).filter(Boolean);
const dt = (v: string | null) => (v && !v.startsWith("30/12/1899") ? v : "");

function Chapter({ t, norm, children, brk = true }: { t: string; norm?: string; children?: ReactNode; brk?: boolean }) {
  return (
    <section className={`${brk ? "print-page-break" : ""} mt-10`}>
      <h2 className="text-center font-sans text-base font-bold uppercase">{t}</h2>
      {norm && <p className="text-center text-xs italic">{NORM(norm)}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
const P = ({ children }: { children: ReactNode }) => <p className="mt-1 whitespace-pre-line text-justify">{children}</p>;
const Lbl = ({ children }: { children: ReactNode }) => <p className="mt-3 font-sans text-xs font-bold">{children}</p>;
function Fields({ rows }: { rows: [string, string | null | undefined][] }) {
  const r = rows.filter(([, v]) => v && v.trim());
  return <table className="w-full"><tbody>{r.map(([k, v]) => <tr key={k}><td className="w-56 py-0.5 pr-3 align-top font-sans text-xs">{k}:</td><td className="font-semibold">{v}</td></tr>)}</tbody></table>;
}
const list = (els: Element[], sep = ";", letters = false) => (
  <ol className="ml-5">{els.map((e, i) => <li key={i}>{letters ? String.fromCharCode(97 + i) : i + 1}) {title(e)}{i === els.length - 1 ? "." : sep}</li>)}</ol>
);

function Misure({ g, el, label }: { g: Graph; el: Element; label: string }) {
  const prev = g.kids(el, TP.prevenzione);
  if (!prev.length) return null;
  return (
    <div>
      <Lbl>{label}</Lbl>
      {list(prev)}
      {prev.map((p, i) => {
        const org = text(p, "RTFMisOrganiz"), ese = text(p, "RTFMisEsecutive");
        return <div key={i}>{org && <><p className="mt-2 font-sans text-xs italic">Prescrizioni Organizzative:</p><P>{org}</P></>}{ese && <><p className="mt-2 font-sans text-xs italic">Prescrizioni Esecutive:</p><P>{ese}</P></>}</div>;
      })}
    </div>
  );
}
const riskNames = (g: Graph, els: Element[]) => uniq(els.flatMap((e) => g.kids(e, TP.rischio)), title).map(title).join("; ");

function Fase({ g, el }: { g: Graph; el: Element }) {
  const mac = g.kids(el, TP.macchina);
  const lav = g.kids(el, TP.lavoratore);
  return (
    <div className="mt-5">
      <h4 className="font-sans text-sm font-bold">{title(el)} (fase)</h4>
      {text(el) && <P>{text(el)}</P>}
      {mac.length > 0 && <><Lbl>Macchine utilizzate:</Lbl>{list(mac)}<Lbl>Rischi generati dall'uso delle macchine:</Lbl><P>{riskNames(g, mac)}.</P></>}
      {lav.length > 0 && <Lbl>Lavoratori impegnati:</Lbl>}
      {lav.map((w, i) => {
        const att = g.kids(w, TP.attrezzo), ris = g.kids(w, TP.rischio);
        return (
          <div key={i} className="mt-2 border-l-2 border-border pl-3">
            <p>{i + 1}) {title(w)};</p>
            <Misure g={g} el={w} label="Misure Preventive e Protettive, aggiuntive a quelle riportate nell'apposito successivo capitolo:" />
            {ris.length > 0 && <><Lbl>Rischi a cui è esposto il lavoratore:</Lbl>{list(ris, ";", true)}</>}
            {att.length > 0 && <><Lbl>Attrezzi utilizzati dal lavoratore:</Lbl>{list(att, ";", true)}<Lbl>Rischi generati dall'uso degli attrezzi:</Lbl><P>{riskNames(g, att)}.</P></>}
          </div>
        );
      })}
    </div>
  );
}

function LavTree({ g, el, depth }: { g: Graph; el: Element; depth: number }) {
  const sub = g.kids(el, TP.lavorazione);
  if (!sub.length) return <Fase g={g} el={el} />;
  return (
    <div className="mt-6">
      <h3 className={`font-sans font-bold ${depth === 0 ? "text-base uppercase" : "text-sm"}`}>{title(el)}</h3>
      {text(el) && <P>{text(el)}</P>}
      <p className="mt-1 font-sans text-xs">La Lavorazione è suddivisa nelle seguenti Fasi e Sottofasi:</p>
      <ul className="ml-5 list-disc">{sub.map((s, i) => <li key={i}>{title(s)}</li>)}</ul>
      {sub.map((s, i) => <LavTree key={i} g={g} el={s} depth={depth + 1} />)}
    </div>
  );
}

function Schede({ g, els, kind }: { g: Graph; els: Element[]; kind: "Attrezzo" | "Macchina" }) {
  return <>{els.map((a, i) => (
    <div key={i} className="mt-5">
      <h4 className="font-sans text-sm font-bold">{title(a)}</h4>
      {text(a) && <P>{text(a)}</P>}
      {g.kids(a, TP.rischio).length > 0 && <><Lbl>Rischi generati dall'uso {kind === "Attrezzo" ? "dell'Attrezzo" : "della Macchina"}:</Lbl>{list(g.kids(a, TP.rischio))}</>}
      <Misure g={g} el={a} label={`Misure Preventive e Protettive relative ${kind === "Attrezzo" ? "all'Attrezzo" : "alla Macchina"}:`} />
    </div>
  ))}</>;
}

export function PscReport({ cover = true, body = true }: { cover?: boolean; body?: boolean }) {
  const tags = ["CollectionLavorazioni", "CollectionLavoratori", "CollectionMacchine", "CollectionAttrezzi", "CollectionRischi", "CollectionPrevenzioni", "CollectionSegnaletica", "CollectionLvCoord", "AreaCantiere"];
  const g = buildGraph(tags.map(root).filter((r): r is Element => !!r));
  const lavoro = root("CollectionLavoro")?.querySelector("ItemLavoro") ?? null;
  const comm = items("CollectionComm", "ItemCommittenti");
  const resp = items("CollectionResp", "ItemResponsabili").filter((r) => r.getAttribute("Nome") || r.getAttribute("Cognome"));
  const imp = items("CollectionImpresa", "ItemImpresa");
  const cse = resp.find((r) => /progettazione/i.test(title(r))) ?? resp[0];
  const a = (el: Element | null | undefined, k: string) => el?.getAttribute(k) ?? "";
  const citta = (el: Element | null | undefined, c = "Citta", p = "Prv") => [a(el, c), a(el, p) && `(${a(el, p)})`].filter(Boolean).join(" ");

  const lavRoot = root("CollectionLavorazioni")?.querySelector("ItemLavorazione[IsRoot='true']") ?? null;
  const top = lavRoot ? g.kids(lavRoot, TP.lavorazione) : [];
  const fasi = Array.from(root("CollectionLavorazioni")?.querySelectorAll("ItemLavorazione[IsRoot='false']") ?? []).filter((f) => g.kids(f, TP.lavorazione).length === 0);
  const lavOf = (f: Element) => g.kids(f, TP.lavoratore);
  const attrezzi = uniq(fasi.flatMap((f) => [...g.kids(f, TP.attrezzo), ...lavOf(f).flatMap((w) => g.kids(w, TP.attrezzo))]), title).sort(alpha);
  const macchine = uniq(fasi.flatMap((f) => g.kids(f, TP.macchina)), title).sort(alpha);
  const fasiDi = (pred: (f: Element) => boolean) => fasi.filter(pred).map(title);
  const usesAtt = (t: string) => (f: Element) => [...g.kids(f, TP.attrezzo), ...lavOf(f).flatMap((w) => g.kids(w, TP.attrezzo))].some((x) => title(x) === t);
  const usesMac = (t: string) => (f: Element) => g.kids(f, TP.macchina).some((x) => title(x) === t);
  // rischi delle lavorazioni (esposizione dei lavoratori e misure sul rischio)
  const rischiLav = fasi.flatMap((f) => lavOf(f).flatMap((w) => g.kids(w, TP.rischio).map((r) => ({ f, r }))));
  const rname = (r: Element) => title(r).replace(/\s+per\s+".*$/, "");
  const rischi = uniq(rischiLav.map((x) => x.r), rname).sort((x, y) => rname(x).localeCompare(rname(y), "it"));
  const coord = Array.from(root("CollectionCoordinamentoGen")?.querySelectorAll("ItemCoordGenerale") ?? []).filter((e) => text(e));
  const emerg = coord.filter((e) => /emergenz/i.test(title(e)));
  const sonori = [...attrezzi.map((x) => ({ x, k: "ATTREZZATURA", f: fasiDi(usesAtt(title(x))) })), ...macchine.map((x) => ({ x, k: "MACCHINA", f: fasiDi(usesMac(title(x))) }))].filter(({ x }) => Number(x.getAttribute("EmissioneRM")) > 0);

  const area = (sel: string) => items("AreaCantiere", sel);
  const areaRootText = (sel: string) => allRootText("AreaCantiere", sel);

  const Cover = (
    <section className="flex min-h-[900px] flex-col text-center print:min-h-[95vh]">
      <p className="font-sans text-sm">Comune di {a(lavoro, "Citta")}<br />Provincia di {a(lavoro, "Prv")}</p>
      <h1 className="mt-24 font-sans text-3xl font-bold uppercase leading-tight">Piano di sicurezza e<br />coordinamento</h1>
      <p className="mt-2 text-xs italic">(Allegato XV e art. 100 del D.Lgs. 9 aprile 2008, n. 81 e s.m.i.)<br />(D.Lgs. 3 agosto 2009, n. 106)</p>
      <div className="mt-16 space-y-3 text-left">
        <p><span className="font-sans text-xs font-bold">OGGETTO:</span> {a(lavoro, "Ogg")}</p>
        {comm[0] && <p><span className="font-sans text-xs font-bold">COMMITTENTE:</span> {a(comm[0], "RagSociale") || `${a(comm[0], "PersNome")} ${a(comm[0], "PersCogn")}`}.</p>}
        <p><span className="font-sans text-xs font-bold">CANTIERE:</span> {a(lavoro, "Indir")}, {citta(lavoro)}</p>
      </div>
      <div className="mt-auto grid grid-cols-2 gap-8 pt-16 text-sm">
        <div><p className="font-sans text-xs font-bold">IL COORDINATORE DELLA SICUREZZA</p><p className="mt-8">_____________________________</p><p>({[a(cse, "Qualif"), a(cse, "Cognome"), a(cse, "Nome")].filter(Boolean).join(" ")})</p></div>
        <div><p className="text-xs">per presa visione</p><p className="font-sans text-xs font-bold">IL COMMITTENTE</p><p className="mt-8">_____________________________</p><p>({[a(comm[0], "PersNome"), a(comm[0], "PersCogn")].join(" ").trim()})</p></div>
      </div>
      {cse && <p className="mt-10 text-left text-xs">{[a(cse, "Qualif"), a(cse, "Cognome"), a(cse, "Nome")].filter(Boolean).join(" ")}<br />{a(cse, "Indir")}<br />{a(cse, "Cap")} {citta(cse)}<br />{a(cse, "Tel") && `Tel.: ${a(cse, "Tel")}`}<br />{a(cse, "Email") && `E-Mail: ${a(cse, "Email")}`}</p>}
    </section>
  );

  const Body = (
    <>
      <Chapter t="Lavoro" norm="punto 2.1.2, lettera a, punto 1, Allegato XV">
        <Lbl>CARATTERISTICHE GENERALI DELL'OPERA:</Lbl>
        <Fields rows={[["Natura dell'Opera", a(lavoro, "NatOper")], ["OGGETTO", a(lavoro, "Ogg")], ["Importo presunto dei Lavori", a(lavoro, "Imp") && `${Number(a(lavoro, "Imp")).toLocaleString("it-IT", { minimumFractionDigits: 2 })} euro`], ["Numero imprese in cantiere", a(lavoro, "NImpr") !== "0" ? `${a(lavoro, "NImpr")} (previsto)` : ""], ["Numero lavoratori autonomi", a(lavoro, "NAut") !== "0" ? a(lavoro, "NAut") : ""], ["Entità presunta del lavoro", a(lavoro, "UoGG") !== "0" ? `${a(lavoro, "UoGG")} uomini/giorno` : ""], ["Data inizio lavori", dt(a(lavoro, "DtInzLa"))], ["Data fine lavori (presunta)", dt(a(lavoro, "DFinLa"))], ["Durata in giorni (presunta)", a(lavoro, "DuGG")]]} />
        <Lbl>Dati del CANTIERE:</Lbl>
        <Fields rows={[["Indirizzo", a(lavoro, "Indir")], ["CAP", a(lavoro, "Cap")], ["Città", citta(lavoro)], ["Telefono / Fax", [a(lavoro, "Tel"), a(lavoro, "Fax")].filter(Boolean).join(" / ")]]} />
      </Chapter>
      <Chapter t="Committenti">
        {comm.map((c, i) => <div key={i} className="mt-3"><Lbl>DATI {title(c).toUpperCase()}:</Lbl><Fields rows={[["Ragione sociale", a(c, "RagSociale")], ["Indirizzo", a(c, "Indir")], ["CAP", a(c, "Cap")], ["Città", citta(c)], ["Telefono / Fax", [a(c, "Tel"), a(c, "Fax")].filter(Boolean).join(" / ")]]} /><p className="mt-2 font-sans text-xs italic">nella Persona di:</p><Fields rows={[["Nome e Cognome", `${a(c, "PersNome")} ${a(c, "PersCogn")}`.trim()], ["Qualifica", a(c, "PersQalif")], ["Indirizzo", a(c, "PersIndir")], ["Città", citta(c, "PersCitta", "PerPrv")], ["Codice Fiscale", a(c, "PerCF")], ["Partita IVA", a(c, "PerPI")]]} /></div>)}
      </Chapter>
      <Chapter t="Responsabili" norm="punto 2.1.2, lettera b, punto 1, Allegato XV">
        {resp.map((r, i) => <div key={i} className="mt-3"><Lbl>{title(r)}:</Lbl><Fields rows={[["Nome e Cognome", `${a(r, "Nome")} ${a(r, "Cognome")}`.trim()], ["Qualifica", a(r, "Qualif")], ["Indirizzo", a(r, "Indir")], ["CAP", a(r, "Cap")], ["Città", citta(r)], ["Telefono / Fax", [a(r, "Tel"), a(r, "Fax")].filter(Boolean).join(" / ")], ["Indirizzo e-mail", a(r, "Email")], ["Codice Fiscale", a(r, "CF")], ["Partita IVA", a(r, "PIVA")], ["Data conferimento incarico", dt(a(r, "DtConf"))]]} /></div>)}
      </Chapter>
      <Chapter t="Imprese" norm="punto 2.1.2, lettera b, punto 1, Allegato XV">
        {imp.map((c, i) => <div key={i} className="mt-3"><Lbl>DATI IMPRESA:</Lbl><Fields rows={[["Impresa", a(c, "TpImpresa") || (a(c, "TpImpresaEx") === "1" ? "Impresa affidataria ed esecutrice" : "")], ["Ragione sociale", a(c, "RagSociale")], ["Datore di lavoro", a(c, "DatoreLav")], ["Indirizzo", a(c, "Indir")], ["CAP", a(c, "Cap")], ["Città", citta(c)], ["Telefono / Fax", [a(c, "Tel"), a(c, "Fax")].filter(Boolean).join(" / ")], ["Indirizzo e-mail", a(c, "Email")], ["Codice Fiscale", a(c, "CF")], ["Partita IVA", a(c, "PIVA")], ["Posizione INPS", a(c, "PosINPS")], ["Posizione INAIL", a(c, "ClsINAIL")], ["Cassa Edile", a(c, "CassaEdile")], ["Registro Imprese (C.C.I.A.A.)", a(c, "NRegImprese")]]} /></div>)}
      </Chapter>
      {allRootText("CollectionDocumentazione").length > 0 && <Chapter t="Documentazione">{allRootText("CollectionDocumentazione").map((t, i) => <P key={i}>{t}</P>)}</Chapter>}
      <Chapter t="Descrizione del contesto in cui è collocata l'area del cantiere" norm="punto 2.1.2, lettera a, punto 2, Allegato XV">{allRootText("CollectionDesAreaCantiere").map((t, i) => <P key={i}>{t}</P>)}</Chapter>
      <Chapter t="Descrizione sintetica dell'opera" norm="punto 2.1.2, lettera a, punto 3, Allegato XV">{allRootText("CollectionDesLavori").map((t, i) => <P key={i}>{t}</P>)}</Chapter>
      <Chapter t="Area del cantiere" brk={false}>
        <p className="text-xs italic">Individuazione, analisi e valutazione dei rischi concreti {NORM("punto 2.1.2, lettera c, Allegato XV")}</p>
      </Chapter>
      <Chapter t="Caratteristiche area del cantiere" norm="punto 2.2.1, lettera a, Allegato XV">{areaRootText("ItemCarAreaCnt").map((t, i) => <P key={i}>{t}</P>)}{area("ItemCarAreaCnt").map((e, i) => <div key={i}><h4 className="mt-3 font-sans text-sm font-bold">{title(e)}</h4><Misure g={g} el={e} label="Misure Preventive e Protettive generali:" /></div>)}</Chapter>
      <Chapter t="Fattori esterni che comportano rischi per il cantiere" norm="punto 2.2.1, lettera b, Allegato XV">
        {areaRootText("ItemFattoriEstAreaCnt[IsRoot='true']").map((t, i) => <P key={"r" + i}>{t}</P>)}
        {area("ItemFattoriEstAreaCnt").map((e, i) => <div key={i} className="mt-3"><h4 className="font-sans text-sm font-bold">{title(e)}</h4>{text(e) && <P>{text(e)}</P>}<Misure g={g} el={e} label="Misure Preventive e Protettive generali:" /></div>)}
      </Chapter>
      <Chapter t="Rischi che le lavorazioni di cantiere comportano per l'area circostante" norm="punto 2.2.1, lettera c, Allegato XV">{areaRootText("ItemRischiTrasmessiArea").map((t, i) => <P key={i}>{t}</P>)}{area("ItemRischiTrasmessiArea").map((e, i) => <div key={i}><h4 className="mt-3 font-sans text-sm font-bold">{title(e)}</h4>{text(e) && <P>{text(e)}</P>}<Misure g={g} el={e} label="Misure Preventive e Protettive generali:" /></div>)}</Chapter>
      {areaRootText("ItemDesIdrogeol").length > 0 && <Chapter t="Descrizione caratteristiche idrogeologiche" norm="punto 2.1.4, Allegato XV">{areaRootText("ItemDesIdrogeol").map((t, i) => <P key={i}>{t}</P>)}</Chapter>}
      <Chapter t="Organizzazione del cantiere" norm="punto 2.1.2, lettera d, punto 2, Allegato XV">{allRootText("CollectionOrganizCnt").map((t, i) => <P key={i}>{t}</P>)}</Chapter>
      <Chapter t="Lavorazioni e loro interferenze" norm="punto 2.1.2, lettera d, punto 3, Allegato XV">
        {top.map((t, i) => <LavTree key={i} g={g} el={t} depth={0} />)}
      </Chapter>
      <Chapter t="Rischi individuati nelle Lavorazioni e relative misure preventive e protettive">
        <p className="font-sans text-xs italic">rischi derivanti dalle lavorazioni e dall'uso di macchine ed attrezzi</p>
        <Lbl>Elenco dei rischi:</Lbl><ol className="ml-5">{rischi.map((r, i) => <li key={i}>{i + 1}) {rname(r)}{i === rischi.length - 1 ? "." : ";"}</li>)}</ol>
        {rischi.map((r, i) => {
          const occ = rischiLav.filter((x) => rname(x.r) === rname(r));
          return (
            <div key={i} className="mt-5">
              <h4 className="font-sans text-sm font-bold">RISCHIO: "{rname(r)}"</h4>
              {text(r) && <><p className="mt-1 font-sans text-xs italic">Descrizione del Rischio:</p><P>{text(r)}</P></>}
              <Lbl>MISURE PREVENTIVE e PROTETTIVE:</Lbl>
              <p>a) Nelle lavorazioni: {uniq(occ.map((x) => title(x.f)), (s) => s).join("; ")};</p>
              {uniq(occ.flatMap((x) => g.kids(x.r, TP.prevenzione)), title).map((p, j) => <div key={j}>{text(p, "RTFMisOrganiz") && <><p className="mt-2 font-sans text-xs italic">Prescrizioni Organizzative:</p><P>{text(p, "RTFMisOrganiz")}</P></>}{text(p, "RTFMisEsecutive") && <><p className="mt-2 font-sans text-xs italic">Prescrizioni Esecutive:</p><P>{text(p, "RTFMisEsecutive")}</P></>}</div>)}
            </div>
          );
        })}
      </Chapter>
      {attrezzi.length > 0 && <Chapter t="Attrezzature utilizzate nelle Lavorazioni"><Lbl>Elenco degli attrezzi:</Lbl>{list(attrezzi)}<Schede g={g} els={attrezzi} kind="Attrezzo" /></Chapter>}
      {macchine.length > 0 && <Chapter t="Macchine utilizzate nelle Lavorazioni"><Lbl>Elenco delle macchine:</Lbl>{list(macchine)}<Schede g={g} els={macchine} kind="Macchina" /></Chapter>}
      {sonori.length > 0 && (
        <Chapter t="Potenza sonora attrezzature e macchine" norm="art 190">
          <table className="w-full font-sans text-xs"><thead><tr className="border-b border-foreground text-left"><th>Attrezzatura / Macchina</th><th>Lavorazioni</th><th>Potenza Sonora dB(A)</th><th>Scheda</th></tr></thead>
            <tbody>{sonori.map(({ x, f }, i) => <tr key={i} className="border-b border-border align-top"><td className="py-1 pr-2">{title(x)}</td><td className="pr-2">{f.join("; ")}.</td><td>{Number(x.getAttribute("EmissioneRM")).toFixed(1)}</td><td>{x.getAttribute("RifSchedaRM")}</td></tr>)}</tbody></table>
        </Chapter>
      )}
      {coord.filter((e) => !emerg.includes(e)).length > 0 && <Chapter t="Coordinamento generale" norm="punto 2.1.2, lettere e, f, g, Allegato XV">{coord.filter((e) => !emerg.includes(e)).map((e, i) => <div key={i}><h4 className="mt-3 font-sans text-sm font-bold">{title(e)}</h4><P>{text(e)}</P></div>)}</Chapter>}
      <Chapter t="Organizzazione servizio di pronto soccorso, antincendio ed evacuazione dei lavoratori" norm="punto 2.1.2, lettera h, Allegato XV">{emerg.map((e, i) => <P key={i}>{text(e)}</P>)}<Lbl>Numeri di telefono delle emergenze:</Lbl><p>Comando Vvf chiamate per soccorso: tel. 115</p><p>Pronto Soccorso tel. 118</p></Chapter>
      {allRootText("CollectionFormazioneLav").length > 0 && <Chapter t="Informazione e formazione dei lavoratori">{allRootText("CollectionFormazioneLav").map((t, i) => <P key={i}>{t}</P>)}</Chapter>}
      {allRootText("CollectionOprPrvMacImp").length > 0 && <Chapter t="Opere provvisionali, macchine e impianti">{allRootText("CollectionOprPrvMacImp").map((t, i) => <P key={i}>{t}</P>)}</Chapter>}
      <Chapter t="Conclusioni generali">{allRootText("CollectionConclusioniGen").map((t, i) => <P key={i}>{t}</P>)}</Chapter>
    </>
  );
  return <>{cover && Cover}{body && Body}</>;
}
