import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { GanttChart } from "@/components/dsf2/GanttChart";
import { Input } from "@/components/ui/input";
import { addDays, fmtIt, ganttRows } from "@/lib/dsf2/gantt";
import { mutate, useDoc } from "@/lib/dsf2/store";

export const Route = createFileRoute("/documento/gantt")({
  head: () => ({ meta: [{ title: "Cronoprogramma — Cantiere PSC" }, { name: "description", content: "Diagramma di Gantt delle lavorazioni." }, { property: "og:title", content: "Cronoprogramma — Cantiere PSC" }, { property: "og:description", content: "Diagramma di Gantt delle lavorazioni." }] }),
  component: GanttPage,
});

function GanttPage() {
  const { version } = useDoc();
  const data = useMemo(() => ganttRows(), [version]);
  if (!data) return <p className="text-muted-foreground">Questo documento non contiene lavorazioni.</p>;
  const { rows, id } = data;
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Allegato A</p>
        <h1 className="text-2xl font-semibold tracking-tight">Cronoprogramma dei lavori</h1>
        <p className="mt-1 text-sm text-muted-foreground">Trascina le barre per spostare una fase, il bordo destro per cambiarne la durata.</p>
      </div>
      <GanttChart rows={rows} id={id} />
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-left text-xs text-muted-foreground"><tr><th className="p-2">Lavorazione</th><th className="p-2 w-36">Inizio</th><th className="p-2 w-24">Giorni</th><th className="p-2 w-28">Fine</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border">
                <td className="p-2" style={{ paddingLeft: 8 + r.depth * 14 }}><span className={r.folder ? "font-semibold" : ""}>{r.title}</span></td>
                <td className="p-1">{r.task && !r.folder && (
                  <Input type="date" className="h-8" value={r.start ? r.start.toISOString().slice(0, 10) : ""}
                    onChange={(e) => { const [y, m, d] = e.target.value.split("-"); if (y && m && d) mutate(id, () => r.task!.setAttribute("DtInizio", `${d}/${m}/${y}`)); }} />)}</td>
                <td className="p-1">{r.task && !r.folder && (
                  <Input type="number" min={1} className="h-8" value={r.days}
                    onChange={(e) => { const n = Math.max(1, Number(e.target.value) || 1); mutate(id, () => r.task!.setAttribute("Durata", String(n))); }} />)}</td>
                <td className="p-2 font-mono text-xs text-muted-foreground">{r.start && !r.folder ? fmtIt(addDays(r.start, r.days - 1)) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
