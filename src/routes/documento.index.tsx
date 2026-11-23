import { createFileRoute, Link } from "@tanstack/react-router";
import { getDoc, sectionByTag, useDoc } from "@/lib/dsf2/store";
import { attrLabel } from "@/lib/dsf2/catalog";

export const Route = createFileRoute("/documento/")({
  head: () => ({ meta: [{ title: "Riepilogo documento — Cantiere PSC" }, { name: "description", content: "Dati principali del cantiere e del PSC." }, { property: "og:title", content: "Riepilogo documento — Cantiere PSC" }, { property: "og:description", content: "Dati principali del cantiere." }] }),
  component: Overview,
});

const KEYS = ["NatOper", "Ogg", "Indir", "Citta", "Prv", "Imp", "DtInzLa", "DFinLa", "DuGG", "UoGG", "NImpr"];

function Overview() {
  const { file } = useDoc();
  const lav = sectionByTag("CollectionLavoro");
  const el = lav ? getDoc(lav.id)?.querySelector("ItemLavoro") : null;
  const comm = sectionByTag("CollectionComm");
  const committenti = comm ? Array.from(getDoc(comm.id)?.querySelectorAll("ItemCommittenti[IsRoot='false']") ?? []) : [];
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Riepilogo</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{el?.getAttribute("Ogg") || file?.name}</h1>
      {el && (
        <dl className="mt-6 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
          {KEYS.map((k) => (
            <div key={k} className="bg-card p-3">
              <dt className="text-xs text-muted-foreground">{attrLabel(k)}</dt>
              <dd className="mt-0.5 text-sm font-medium">{el.getAttribute(k) || "—"}</dd>
            </div>
          ))}
        </dl>
      )}
      {lav && <Link to="/documento/sezione/$id" params={{ id: String(lav.id) }} className="mt-3 inline-block text-sm text-primary underline-offset-4 hover:underline">Modifica dati del lavoro →</Link>}
      <h2 className="mt-8 text-lg font-semibold">Committenti</h2>
      <ul className="mt-2 space-y-1 text-sm">
        {committenti.map((c, i) => <li key={i}>{c.getAttribute("RagSociale") || c.getAttribute("Titolo")}</li>)}
        {!committenti.length && <li className="text-muted-foreground">Nessun committente</li>}
      </ul>
      <p className="mt-8 text-xs text-muted-foreground">{file?.sections.length} sezioni lette dal file.</p>
    </div>
  );
}
