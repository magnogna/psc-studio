import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rtfToText } from "@/lib/dsf2/rtf";
import { archiveChildren, archiveRoot, insertFromArchive, openArchive, type ArchiveSource } from "@/lib/dsf2/insert";
import { useDoc } from "@/lib/dsf2/store";
import { prettyArchive, useArchiveFiles } from "@/components/dsf2/ArchiveFiles";

export const Route = createFileRoute("/documento/inserisci")({
  head: () => ({ meta: [{ title: "Inserisci da archivio — Cantiere PSC" }, { name: "description", content: "Inserisci fasi, rischi e testi dagli archivi nel PSC." }, { property: "og:title", content: "Inserisci da archivio — Cantiere PSC" }, { property: "og:description", content: "Inserisci elementi dagli archivi nel PSC." }] }),
  component: InsertPage,
});

function InsertPage() {
  const { files } = useArchiveFiles();
  const { file } = useDoc();
  const [fileId, setFileId] = useState("");
  const rec = files.find((f) => f.id === fileId);
  const src = useMemo(() => { try { return rec ? openArchive(rec) : null; } catch { return null; } }, [rec]);
  const sections = useMemo(() => src?.file.sections.filter((s) => s.kind === "xml" && (s.originalXml!.match(/<Item/g)?.length ?? 0) > 3 && file?.sections.some((t) => t.rootTag === s.rootTag) && !/Stampe|Styler/.test(s.rootTag)) ?? [], [src, file]);
  const [tag, setTag] = useState("");
  const [q, setQ] = useState("");

  return (
    <div className="space-y-5">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">Archivio</p>
        <h1 className="text-2xl font-semibold tracking-tight">Inserisci elementi nel PSC</h1>
        <p className="mt-1 text-sm text-muted-foreground">Scegli un archivio e una sezione, poi premi + sugli elementi da copiare. Le fasi portano con sé lavoratori, attrezzi, macchine e rischi.</p>
      </div>
      {!files.length && <p className="text-sm">Nessun archivio caricato. <Link to="/archivio" className="text-primary underline">Carica gli archivi</Link>.</p>}
      <div className="flex flex-wrap gap-2">
        {files.map((f) => <Button key={f.id} size="sm" variant={f.id === fileId ? "default" : "outline"} onClick={() => { setFileId(f.id); setTag(""); }}>{prettyArchive(f.name)}</Button>)}
      </div>
      {src && (
        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          {sections.map((s) => <Button key={s.id} size="sm" variant={s.rootTag === tag ? "secondary" : "ghost"} onClick={() => setTag(s.rootTag)}>{s.title}</Button>)}
        </div>
      )}
      {src && tag && (
        <>
          <Input placeholder="Cerca nell'archivio…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
          <Tree src={src} tag={tag} q={q.trim().toLowerCase()} />
        </>
      )}
    </div>
  );
}

function Tree({ src, tag, q }: { src: ArchiveSource; tag: string; q: string }) {
  const root = archiveRoot(src, tag);
  if (!root) return null;
  if (q) {
    const hits = Array.from(root.firstElementChild?.children ?? []).filter((e) => e.getAttribute("IsRoot") !== "true" && (e.getAttribute("Titolo") ?? "").toLowerCase().includes(q)).slice(0, 100);
    return <div className="space-y-1">{hits.map((e, i) => <Row key={i} src={src} tag={tag} el={e} root={root} />)}{!hits.length && <p className="text-sm text-muted-foreground">Nessun risultato.</p>}</div>;
  }
  return <div className="space-y-1">{archiveChildren(root, null).map((e, i) => <Row key={i} src={src} tag={tag} el={e} root={root} />)}</div>;
}

function Row({ src, tag, el, root }: { src: ArchiveSource; tag: string; el: Element; root: Element }) {
  const [open, setOpen] = useState(false);
  const kids = open ? archiveChildren(root, el) : [];
  const hasKids = el.getAttribute("IsCartella") === "true";
  const desc = el.getAttribute("DesAttivita") || el.getAttribute("RTF") || "";
  const insert = () => {
    try {
      const n = insertFromArchive(src, tag, el);
      toast.success(`Inserito: ${el.getAttribute("Titolo")}`, { description: `${n} elementi copiati nel PSC` });
    } catch (e) { toast.error("Inserimento non riuscito", { description: e instanceof Error ? e.message : String(e) }); }
  };
  return (
    <div className="rounded-md border border-border bg-card">
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button className="flex flex-1 items-center gap-1.5 text-left text-sm" onClick={() => setOpen(!open)}>
          <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-90" : ""} ${hasKids || desc ? "" : "opacity-0"}`} />
          <span className={hasKids ? "font-semibold" : ""}>{el.getAttribute("Titolo")}</span>
        </button>
        <Button size="sm" variant="secondary" onClick={insert} aria-label="Inserisci nel PSC"><Plus className="h-4 w-4" /></Button>
      </div>
      {open && (
        <div className="space-y-1 border-t border-border p-2 pl-6">
          {desc && <p className="whitespace-pre-line text-xs text-muted-foreground">{rtfToText(desc).slice(0, 600)}</p>}
          {kids.map((k, i) => <Row key={i} src={src} tag={tag} el={k} root={root} />)}
        </div>
      )}
    </div>
  );
}
