import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { FileUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addArchiveFile, listArchiveFiles, removeArchiveFile, type ArchiveFileRec } from "@/lib/dsf2/insert";

export function useArchiveFiles() {
  const [files, setFiles] = useState<ArchiveFileRec[]>([]);
  const reload = () => void listArchiveFiles().then(setFiles);
  useEffect(reload, []);
  return { files, reload };
}

export const prettyArchive = (n: string) => n.replace(/^ARCHIVIO_/, "").replace(/_PROG(-\d+)?\.dsf2$/i, "").replace(/\.dsf2$/i, "").replace(/_/g, " ");

export function ArchiveFiles() {
  const { files, reload } = useArchiveFiles();
  const input = useRef<HTMLInputElement>(null);
  const add = async (list: FileList) => {
    for (const f of Array.from(list)) {
      try { await addArchiveFile(f.name, new Uint8Array(await f.arrayBuffer())); toast.success(`Archivio aggiunto: ${prettyArchive(f.name)}`); }
      catch (e) { toast.error(`${f.name} non leggibile`, { description: e instanceof Error ? e.message : String(e) }); }
    }
    reload();
  };
  return (
    <section className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Archivi .dsf2</h2>
          <p className="text-sm text-muted-foreground">Carica i tuoi archivi (fasi di lavoro, rischi, fascicolo…). Restano salvati in questo browser.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => input.current?.click()}><FileUp className="h-4 w-4" />Carica archivi</Button>
          <Button asChild><Link to="/documento/inserisci">Inserisci nel PSC</Link></Button>
        </div>
        <input ref={input} type="file" multiple accept=".dsf2" className="hidden" onChange={(e) => { if (e.target.files) void add(e.target.files); e.target.value = ""; }} />
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {files.map((f) => (
          <li key={f.id} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm">
            <span><span className="font-medium">{prettyArchive(f.name)}</span> <span className="font-mono text-xs text-muted-foreground">{(f.raw.length / 1024 / 1024).toFixed(1)} MB</span></span>
            <Button variant="ghost" size="icon" aria-label="Rimuovi archivio" onClick={async () => { await removeArchiveFile(f.id); reload(); }}><Trash2 className="h-4 w-4" /></Button>
          </li>
        ))}
        {!files.length && <li className="text-sm text-muted-foreground">Nessun archivio caricato.</li>}
      </ul>
    </section>
  );
}
