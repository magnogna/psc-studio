import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FileUp, History, HardHat, Library, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loadFile, readDraftInfo, restoreDraft } from "@/lib/dsf2/store";
import { blankFromTemplate } from "@/lib/dsf2/template";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cantiere PSC — apri e modifica file .dsf2" },
      { name: "description", content: "Editor di PSC, Fascicolo dell'opera e cronoprogramma per file .dsf2, tutto nel tuo browser." },
      { property: "og:title", content: "Cantiere PSC — apri e modifica file .dsf2" },
      { property: "og:description", content: "Editor di PSC, Fascicolo dell'opera e cronoprogramma per file .dsf2." },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const tplInput = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [draft, setDraft] = useState<{ name: string; at: number } | null>(null);

  useEffect(() => {
    void readDraftInfo().then(setDraft);
  }, []);

  async function open(f: File, asTemplate = false) {
    try {
      const buf = new Uint8Array(await f.arrayBuffer());
      const file = loadFile(buf, asTemplate ? "nuovo-documento.dsf2" : f.name);
      if (asTemplate) blankFromTemplate();
      toast.success(asTemplate ? "Nuovo documento creato dal modello" : `Aperto ${f.name}`, {
        description: `${file.sections.filter((s) => s.kind === "xml").length} sezioni lette`,
      });
      void navigate({ to: "/documento" });
    } catch (e) {
      toast.error("Impossibile aprire il file", { description: e instanceof Error ? e.message : String(e) });
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-ink text-ink-foreground">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2 font-semibold tracking-tight">
            <HardHat className="h-5 w-5 text-primary" /> Cantiere PSC
          </div>
          <Link to="/archivio" className="flex items-center gap-1.5 text-sm opacity-80 hover:opacity-100">
            <Library className="h-4 w-4" /> Archivio
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-12 md:py-20">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">PSC · Fascicolo · Cronoprogramma</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
          Apri i tuoi piani di sicurezza .dsf2 e modificali senza CerTus.
        </h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          Il file resta sul tuo computer: viene letto e salvato direttamente nel browser.
        </p>

        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) void open(f); }}
          onClick={() => input.current?.click()}
          className={`mt-10 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-14 text-center transition-colors ${drag ? "border-primary bg-accent" : "border-input bg-card hover:border-primary"}`}
        >
          <FileUp className="h-9 w-9 text-primary" />
          <p className="mt-3 font-medium">Trascina qui un file .dsf2</p>
          <p className="text-sm text-muted-foreground">oppure clicca per sceglierlo</p>
          <input ref={input} type="file" accept=".dsf2" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void open(f); e.target.value = ""; }} />
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="font-medium">Nuovo documento</p>
            <p className="mt-1 text-sm text-muted-foreground">Scegli un .dsf2 esistente come modello: l'app svuota anagrafica, committenti, responsabili e imprese.</p>
            <Button variant="secondary" className="mt-3" onClick={() => tplInput.current?.click()}>Crea da modello</Button>
            <input ref={tplInput} type="file" accept=".dsf2" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void open(f, true); e.target.value = ""; }} />
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="flex items-center gap-1.5 font-medium"><History className="h-4 w-4" /> Bozza salvata</p>
            {draft ? (
              <>
                <p className="mt-1 text-sm text-muted-foreground">{draft.name} · {new Date(draft.at).toLocaleString("it-IT")}</p>
                <Button className="mt-3" onClick={async () => { if (await restoreDraft()) void navigate({ to: "/documento" }); }}>Riprendi</Button>
              </>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">Le modifiche vengono salvate automaticamente nel browser mentre lavori.</p>
            )}
          </div>
        </div>

        <p className="mt-8 flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
          Il formato .dsf2 non è documentato da ACCA. Prima di usare un file salvato qui, verifica che si apra correttamente in CerTus.
        </p>
      </section>
    </main>
  );
}
