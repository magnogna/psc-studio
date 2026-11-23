import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KIND_LABEL, listArchive, removeFromArchive, updateArchive, type ArchiveEntry } from "@/lib/archive";
import { attrLabel } from "@/lib/dsf2/catalog";
import { ArchiveFiles } from "@/components/dsf2/ArchiveFiles";

export const Route = createFileRoute("/archivio")({
  head: () => ({ meta: [{ title: "Archivio — Cantiere PSC" }, { name: "description", content: "Archivi .dsf2 di fasi, rischi, imprese e testi riutilizzabili." }, { property: "og:title", content: "Archivio — Cantiere PSC" }, { property: "og:description", content: "Archivi riutilizzabili per i PSC." }] }),
  component: ArchivioPage,
});

function ArchivioPage() {
  const [items, setItems] = useState<ArchiveEntry[]>([]);
  const reload = () => void listArchive().then(setItems);
  useEffect(reload, []);
  return (
    <main className="mx-auto max-w-5xl px-5 py-8">
      <Link to="/documento" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Torna al documento</Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Archivio</h1>
      <ArchiveFiles />
      <h2 className="mt-12 text-xl font-semibold">Anagrafiche salvate</h2>
      <p className="text-sm text-muted-foreground">Imprese e persone salvate dai documenti con «Salva in archivio».</p>
      {(Object.keys(KIND_LABEL) as (keyof typeof KIND_LABEL)[]).map((k) => {
        const list = items.filter((i) => i.kind === k);
        return (
          <section key={k} className="mt-6">
            <h3 className="font-mono text-xs uppercase tracking-[0.2em] text-primary">{KIND_LABEL[k]} ({list.length})</h3>
            <div className="mt-2 space-y-2">
              {list.map((e) => (
                <details key={e.id} className="rounded-md border border-border bg-card">
                  <summary className="flex cursor-pointer items-center justify-between px-3 py-2 text-sm font-medium">{e.name}
                    <Button variant="ghost" size="icon" aria-label="Elimina" onClick={async (ev) => { ev.preventDefault(); await removeFromArchive(e.id); reload(); }}><Trash2 className="h-4 w-4" /></Button>
                  </summary>
                  <div className="grid gap-2 border-t border-border p-3 sm:grid-cols-2">
                    {Object.entries(e.fields).filter(([, v]) => v && !v.startsWith("{\\rtf") && v.length < 200).map(([f, v]) => (
                      <label key={f} className="block text-xs text-muted-foreground">{attrLabel(f)}
                        <Input className="mt-1 h-8" defaultValue={v} onBlur={(ev) => void updateArchive({ ...e, fields: { ...e.fields, [f]: ev.target.value } })} />
                      </label>
                    ))}
                  </div>
                </details>
              ))}
              {!list.length && <p className="text-sm text-muted-foreground">Vuoto.</p>}
            </div>
          </section>
        );
      })}
    </main>
  );
}
