import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { ENT, PROB, riskLevel, toneCls } from "@/lib/dsf2/catalog";
import { riskRows } from "@/lib/dsf2/risks";
import { mutate, useDoc } from "@/lib/dsf2/store";

export const Route = createFileRoute("/documento/rischi")({
  head: () => ({ meta: [{ title: "Analisi dei rischi — Cantiere PSC" }, { name: "description", content: "Valutazione dei rischi P x E per ogni lavorazione." }, { property: "og:title", content: "Analisi dei rischi — Cantiere PSC" }, { property: "og:description", content: "Valutazione dei rischi del cantiere." }] }),
  component: RischiPage,
});


function RischiPage() {
  const { version } = useDoc();
  const data = useMemo(() => riskRows(), [version]);
  const [q, setQ] = useState("");
  if (!data) return <p className="text-muted-foreground">Nessuna sezione rischi nel documento.</p>;
  const rows = data.rows.filter((r) => !q || (r.title + r.path.join(" ")).toLowerCase().includes(q.toLowerCase()));
  const set = (el: Element, k: string, v: number) => mutate(data.id, () => el.setAttribute(k, String(v)));
  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Allegato B</p>
        <h1 className="text-2xl font-semibold tracking-tight">Analisi e valutazione dei rischi</h1>
        <p className="mt-1 text-sm text-muted-foreground">R = P × E. Probabilità e entità da 1 a 4, come nella matrice del PSC.</p>
      </div>
      <Input placeholder="Cerca rischio o lavorazione…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground">
            <tr><th className="p-2">Rischio</th><th className="p-2">Riferito a</th><th className="p-2">E</th><th className="p-2">P</th><th className="p-2">R</th></tr>
          </thead>
          <tbody>
            {rows.slice(0, 400).map((r, i) => {
              const lv = riskLevel(r.p, r.e);
              return (
                <tr key={i} className="border-t border-border align-top">
                  <td className="p-2 font-medium">{r.title}</td>
                  <td className="p-2 text-xs text-muted-foreground">{r.path.join(" › ")}</td>
                  <td className="p-1"><select className="h-8 rounded border border-input bg-background px-1 text-xs" value={r.e} onChange={(e) => set(r.el, "DannoEnt", Number(e.target.value))}>{ENT.map((l, k) => <option key={k} value={k}>E{k + 1} {l}</option>)}</select></td>
                  <td className="p-1"><select className="h-8 rounded border border-input bg-background px-1 text-xs" value={r.p} onChange={(e) => set(r.el, "DannoPro", Number(e.target.value))}>{PROB.map((l, k) => <option key={k} value={k}>P{k + 1} {l}</option>)}</select></td>
                  <td className="p-2"><span className={`inline-block whitespace-nowrap rounded px-2 py-0.5 font-mono text-xs ${toneCls[lv.tone]}`}>{lv.r} {lv.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.length > 400 && <p className="text-xs text-muted-foreground">Mostrati 400 su {rows.length}. Usa la ricerca per filtrare.</p>}
    </div>
  );
}
