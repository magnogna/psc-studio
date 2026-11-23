import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { GROUPS, ENT, PROB, attrLabel, riskLevel, toneCls } from "@/lib/dsf2/catalog";
import { isRtf, rtfToText } from "@/lib/dsf2/rtf";
import { getDoc, sectionByTag, useAutoRestore } from "@/lib/dsf2/store";
import { addDays, fmtIt, ganttRows } from "@/lib/dsf2/gantt";
import { riskRows } from "@/lib/dsf2/risks";
import { GanttChart } from "@/components/dsf2/GanttChart";

export const Route = createFileRoute("/stampa")({
  head: () => ({ meta: [{ title: "Stampa PSC — Cantiere PSC" }, { name: "description", content: "Anteprima di stampa ed esportazione PDF del PSC." }, { property: "og:title", content: "Stampa PSC — Cantiere PSC" }, { property: "og:description", content: "Esporta il PSC in PDF." }] }),
  component: StampaPage,
});

const PARTS = [
  { key: "anagrafica", label: "Anagrafica" },
  { key: "relazione", label: "Relazione PSC" },
  { key: "fascicolo", label: "Fascicolo dell'opera" },
  { key: "gantt", label: "Cronoprogramma (Gantt)" },
  { key: "rischi", label: "Analisi dei rischi" },
] as const;
type Part = (typeof PARTS)[number]["key"];

function texts(tag: string) {
  const sec = sectionByTag(tag);
  const root = sec ? getDoc(sec.id) : null;
  if (!root) return [];
  const out: { title: string; body: string }[] = [];
  root.querySelectorAll("*").forEach((el) => {
    if (!el.tagName.startsWith("Item") || el.getAttribute("IsRoot") === "true") return;
    const body = Array.from(el.attributes).filter((a) => isRtf(a.value)).map((a) => rtfToText(a.value)).filter(Boolean).join("\n\n");
    if (body) out.push({ title: el.getAttribute("Titolo") ?? "", body });
  });
  return out;
}

function StampaPage() {
  const { file, ready, version } = useAutoRestore();
  const [parts, setParts] = useState<Set<Part>>(new Set(PARTS.map((p) => p.key)));
  const gantt = useMemo(() => ganttRows(), [version]);
  const risks = useMemo(() => riskRows(), [version]);
  if (!file && !ready) return <p className="p-8 text-sm text-muted-foreground">Caricamento…</p>;
  if (!file) return <div className="p-8"><Link to="/" className="text-primary underline">Apri un documento</Link></div>;
  const lav = sectionByTag("CollectionLavoro");
  const lavoro = lav ? getDoc(lav.id)?.querySelector("ItemLavoro") : null;
  const people = (tag: string, sel: string) => { const s = sectionByTag(tag); return s ? Array.from(getDoc(s.id)?.querySelectorAll(`${sel}[IsRoot='false']`) ?? []) : []; };
  const relGroups = GROUPS.filter((g) => ["documentazione", "psc"].includes(g.key));
  const fasc = GROUPS.find((g) => g.key === "fascicolo")!;
  const has = (p: Part) => parts.has(p);

  return (
    <div className="min-h-screen bg-background">
      <div className="no-print sticky top-0 z-10 flex flex-wrap items-center gap-4 border-b border-border bg-background px-4 py-3">
        <Link to="/documento" className="inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Documento</Link>
        {PARTS.map((p) => (
          <label key={p.key} className="flex items-center gap-1.5 text-sm">
            <Checkbox checked={has(p.key)} onCheckedChange={(v) => { const n = new Set(parts); if (v) n.add(p.key); else n.delete(p.key); setParts(n); }} />{p.label}
          </label>
        ))}
        <Button className="ml-auto" onClick={() => window.print()}><Printer className="h-4 w-4" />Salva PDF</Button>
      </div>

      <article className="mx-auto max-w-[800px] bg-card px-10 py-12 font-serif text-[13px] leading-relaxed text-card-foreground print:max-w-none print:px-0 print:py-0">
        <header className="border-b-2 border-foreground pb-6 text-center">
          <p className="font-sans text-xs uppercase tracking-[0.25em]">Piano di sicurezza e di coordinamento</p>
          <h1 className="mt-3 font-sans text-2xl font-semibold">{lavoro?.getAttribute("Ogg") || file.name}</h1>
          <p className="mt-2">{[lavoro?.getAttribute("Indir"), lavoro?.getAttribute("Citta"), lavoro?.getAttribute("Prv")].filter(Boolean).join(", ")}</p>
        </header>

        {has("anagrafica") && (
          <section className="mt-8">
            <h2 className="font-sans text-lg font-semibold uppercase">Anagrafica</h2>
            {lavoro && <table className="mt-3 w-full"><tbody>{["NatOper", "Ogg", "Imp", "DtInzLa", "DFinLa", "DuGG", "UoGG"].map((k) => <tr key={k} className="border-b border-border"><td className="w-48 py-1 pr-3 font-sans text-xs text-muted-foreground">{attrLabel(k)}</td><td>{lavoro.getAttribute(k)}</td></tr>)}</tbody></table>}
            {[["Committenti", "CollectionComm", "ItemCommittenti"], ["Responsabili", "CollectionResp", "ItemResponsabili"], ["Imprese", "CollectionImpresa", "ItemImpresa"]].map(([label, tag, sel]) => (
              <div key={tag} className="mt-4">
                <h3 className="font-sans text-sm font-semibold">{label}</h3>
                {people(tag!, sel!).map((p, i) => (
                  <p key={i} className="mt-1"><strong>{p.getAttribute("Titolo")}:</strong> {[p.getAttribute("RagSociale"), [p.getAttribute("PersNome"), p.getAttribute("PersCogn")].filter(Boolean).join(" "), p.getAttribute("Indir"), p.getAttribute("Citta")].filter(Boolean).join(" · ")}</p>
                ))}
              </div>
            ))}
          </section>
        )}

        {has("relazione") && relGroups.map((g) => (
          <section key={g.key} className="print-page-break mt-10">
            <h2 className="font-sans text-lg font-semibold uppercase">{g.label}</h2>
            {g.tags.map((t) => texts(t).map((x, i) => (
              <div key={t + i} className="mt-4"><h3 className="font-sans text-sm font-semibold">{x.title}</h3><p className="mt-1 whitespace-pre-line text-justify">{x.body}</p></div>
            )))}
          </section>
        ))}

        {has("fascicolo") && (
          <section className="print-page-break mt-10">
            <h2 className="font-sans text-lg font-semibold uppercase">Fascicolo dell'opera</h2>
            {fasc.tags.map((t) => texts(t).map((x, i) => (
              <div key={t + i} className="mt-4"><h3 className="font-sans text-sm font-semibold">{x.title}</h3><p className="mt-1 whitespace-pre-line">{x.body}</p></div>
            )))}
          </section>
        )}

        {has("gantt") && gantt && (
          <section className="print-page-break mt-10">
            <h2 className="font-sans text-lg font-semibold uppercase">Allegato A — Diagramma di Gantt</h2>
            <div className="mt-4"><GanttChart rows={gantt.rows} id={gantt.id} readOnly /></div>
            <table className="mt-4 w-full font-sans text-xs"><thead><tr className="border-b border-foreground text-left"><th>Lavorazione</th><th>Inizio</th><th>Fine</th><th>gg</th></tr></thead>
              <tbody>{gantt.rows.filter((r) => !r.folder && r.start).map((r, i) => <tr key={i} className="border-b border-border"><td className="py-1">{r.title}</td><td>{fmtIt(r.start!)}</td><td>{fmtIt(addDays(r.start!, r.days - 1))}</td><td>{r.days}</td></tr>)}</tbody></table>
          </section>
        )}

        {has("rischi") && risks && (
          <section className="print-page-break mt-10">
            <h2 className="font-sans text-lg font-semibold uppercase">Allegato B — Analisi e valutazione dei rischi</h2>
            <p className="mt-2">Il rischio [R] è il prodotto dell'entità del danno [E] per la probabilità di accadimento [P]. E: {ENT.map((e, i) => `E${i + 1} ${e}`).join(", ")}. P: {PROB.map((p, i) => `P${i + 1} ${p}`).join(", ")}.</p>
            <table className="mt-4 w-full font-sans text-xs"><thead><tr className="border-b border-foreground text-left"><th>Rischio</th><th>Riferito a</th><th className="w-28">Valutazione</th></tr></thead>
              <tbody>{risks.rows.map((r, i) => { const lv = riskLevel(r.p, r.e); return (
                <tr key={i} className="border-b border-border align-top"><td className="py-1 pr-2">{r.title}</td><td className="pr-2 text-muted-foreground">{r.path.join(" › ")}</td><td><span className={`rounded px-1.5 font-mono ${toneCls[lv.tone]}`}>E{r.e + 1} × P{r.p + 1} = {lv.r}</span></td></tr>); })}</tbody></table>
          </section>
        )}
      </article>
    </div>
  );
}
