import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { BarChart3, FileDown, HardHat, Library, Printer, ShieldAlert, X, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GROUPS, TAG_GROUP } from "@/lib/dsf2/catalog";
import { closeFile, useAutoRestore } from "@/lib/dsf2/store";
import { saveDsf2 } from "@/components/dsf2/actions";

export const Route = createFileRoute("/documento")({
  head: () => ({
    meta: [
      { title: "Documento — Cantiere PSC" },
      { name: "description", content: "Modifica capitoli, anagrafica, cronoprogramma e rischi del documento .dsf2." },
      { property: "og:title", content: "Documento — Cantiere PSC" },
      { property: "og:description", content: "Modifica il documento .dsf2 aperto." },
    ],
  }),
  component: DocLayout,
});

const linkCls = "block rounded px-2 py-1.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground";
const activeCls = "bg-sidebar-accent text-sidebar-accent-foreground font-medium";

function DocLayout() {
  const { file, ready, dirty } = useAutoRestore();
  const navigate = useNavigate();
  if (!file && !ready) return <p className="p-8 text-sm text-muted-foreground">Caricamento…</p>;
  if (!file) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-lg font-medium">Nessun documento aperto</p>
        <Button asChild><Link to="/">Apri un file .dsf2</Link></Button>
      </div>
    );
  }
  const xml = file.sections.filter((s) => s.kind === "xml");
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="no-print bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:h-screen md:w-64 md:shrink-0 md:overflow-y-auto">
        <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold"><HardHat className="h-4 w-4 text-sidebar-primary" /> Cantiere PSC</Link>
          <button aria-label="Chiudi documento" className="opacity-70 hover:opacity-100" onClick={() => { closeFile(); void navigate({ to: "/" }); }}><X className="h-4 w-4" /></button>
        </div>
        <nav className="max-h-[45vh] overflow-y-auto px-2 py-3 md:max-h-none">
          <Link to="/documento" activeOptions={{ exact: true }} className={linkCls} activeProps={{ className: activeCls }}><LayoutDashboard className="mr-1.5 inline h-3.5 w-3.5" />Riepilogo</Link>
          <Link to="/documento/gantt" className={linkCls} activeProps={{ className: activeCls }}><BarChart3 className="mr-1.5 inline h-3.5 w-3.5" />Cronoprogramma</Link>
          <Link to="/documento/inserisci" className={linkCls} activeProps={{ className: activeCls }}><Library className="mr-1.5 inline h-3.5 w-3.5" />Inserisci da archivio</Link>
          <Link to="/documento/rischi" className={linkCls} activeProps={{ className: activeCls }}><ShieldAlert className="mr-1.5 inline h-3.5 w-3.5" />Analisi dei rischi</Link>
          {GROUPS.map((g) => {
            const items = xml.filter((s) => TAG_GROUP.get(s.rootTag) === g.key);
            if (!items.length) return null;
            return (
              <div key={g.key} className="mt-4">
                <p className="px-2 pb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-sidebar-primary">{g.label}</p>
                {items.map((s) => (
                  <Link key={s.id} to="/documento/sezione/$id" params={{ id: String(s.id) }} className={linkCls} activeProps={{ className: activeCls }}>
                    {s.title || s.rootTag}{dirty.has(s.id) && <span className="ml-1 text-sidebar-primary">•</span>}
                  </Link>
                ))}
              </div>
            );
          })}
          <div className="mt-4">
            <p className="px-2 pb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-sidebar-primary">Altro</p>
            {xml.filter((s) => !TAG_GROUP.has(s.rootTag) && s.title).map((s) => (
              <Link key={s.id} to="/documento/sezione/$id" params={{ id: String(s.id) }} className={linkCls} activeProps={{ className: activeCls }}>{s.title}</Link>
            ))}
          </div>
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <div className="no-print sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-border bg-background/95 px-4 py-2 backdrop-blur">
          <p className="mr-auto truncate font-mono text-xs text-muted-foreground">{file.name}{dirty.size > 0 && ` · ${dirty.size} sezioni modificate`}</p>
          <Button variant="ghost" size="sm" asChild><Link to="/archivio"><Library className="h-4 w-4" />Archivio</Link></Button>
          <Button variant="outline" size="sm" asChild><Link to="/stampa"><Printer className="h-4 w-4" />PDF</Link></Button>
          <Button size="sm" onClick={() => saveDsf2(file.name)}><FileDown className="h-4 w-4" />Salva .dsf2</Button>
        </div>
        <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
