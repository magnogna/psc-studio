import { useEffect, useState } from "react";
import { ChevronRight, Folder, Save, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HIDDEN_ATTRS, attrLabel } from "@/lib/dsf2/catalog";
import { isRtf, rtfToText, textToRtf } from "@/lib/dsf2/rtf";
import { mutate } from "@/lib/dsf2/store";
import { addToArchive, KIND_FOR_TAG, listArchive, type ArchiveEntry } from "@/lib/archive";

const PAGE = 40;

export function SectionEditor({ id, root }: { id: number; root: Element }) {
  return (
    <div className="space-y-3">
      {Array.from(root.children).map((el, i) => <Node key={i} id={id} el={el} depth={0} defaultOpen />)}
    </div>
  );
}

function titleOf(el: Element) {
  return (el.getAttribute("Titolo") || el.tagName).replace(/&apos;/g, "'");
}

function Node({ id, el, depth, defaultOpen = false }: { id: number; el: Element; depth: number; defaultOpen?: boolean }) {
  const isCollection = el.tagName.startsWith("Collection");
  const kids = Array.from(el.children);
  const [open, setOpen] = useState(defaultOpen);
  const [limit, setLimit] = useState(PAGE);

  if (isCollection) {
    if (!kids.length && depth > 0) return null;
    return (
      <section className={depth === 0 ? "" : "mt-2"}>
        <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-1.5 text-left">
          <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
          <span className={depth === 0 ? "text-xl font-semibold tracking-tight" : "text-sm font-semibold text-muted-foreground"}>{titleOf(el)}</span>
          <span className="font-mono text-xs text-muted-foreground">({kids.length})</span>
        </button>
        {open && (
          <div className="mt-2 space-y-2 border-l border-border pl-3">
            {depth === 0 && <Fields id={id} el={el} />}
            {kids.slice(0, limit).map((k, i) => <Node key={i} id={id} el={k} depth={depth + 1} />)}
            {kids.length > limit && <Button variant="ghost" size="sm" onClick={() => setLimit(limit + PAGE)}>Mostra altri {Math.min(PAGE, kids.length - limit)}</Button>}
          </div>
        )}
      </section>
    );
  }

  const folder = el.getAttribute("IsCartella") === "true";
  const isRoot = el.getAttribute("IsRoot") === "true";
  return (
    <div className="rounded-md border border-border bg-card">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-3 py-2 text-left">
        <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
        {folder && <Folder className="h-4 w-4 text-primary" />}
        <span className={`text-sm ${isRoot ? "font-mono text-xs uppercase text-muted-foreground" : "font-medium"}`}>{titleOf(el)}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-border px-3 py-3">
          <TitleField id={id} el={el} />
          <ArchiveBar id={id} el={el} />
          <Fields id={id} el={el} />
          {kids.slice(0, limit).map((k, i) => <Node key={i} id={id} el={k} depth={depth + 1} />)}
          {kids.length > limit && <Button variant="ghost" size="sm" onClick={() => setLimit(limit + PAGE)}>Mostra altri</Button>}
        </div>
      )}
    </div>
  );
}

function TitleField({ id, el }: { id: number; el: Element }) {
  if (el.getAttribute("IsRoot") === "true") return null;
  return <TextField id={id} el={el} name="Titolo" label="Titolo" />;
}

function Fields({ id, el }: { id: number; el: Element }) {
  const attrs = Array.from(el.attributes).filter((a) => !HIDDEN_ATTRS.has(a.name));
  const rtf = attrs.filter((a) => isRtf(a.value) || a.name === "RTF");
  const bools = attrs.filter((a) => !rtf.includes(a) && (a.value === "true" || a.value === "false"));
  const plain = attrs.filter((a) => !rtf.includes(a) && !bools.includes(a));
  if (!attrs.length) return null;
  return (
    <div className="space-y-3">
      {plain.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {plain.map((a) => <TextField key={a.name} id={id} el={el} name={a.name} label={attrLabel(a.name)} />)}
        </div>
      )}
      {rtf.map((a) => <RtfField key={a.name} id={id} el={el} name={a.name} />)}
      {bools.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-xs text-muted-foreground">Opzioni ({bools.length})</summary>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {bools.map((a) => (
              <label key={a.name} className="flex items-center gap-2 text-xs">
                <Switch defaultChecked={a.value === "true"} onCheckedChange={(v) => mutate(id, () => el.setAttribute(a.name, String(v)))} />
                {attrLabel(a.name)}
              </label>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function TextField({ id, el, name, label }: { id: number; el: Element; name: string; label: string }) {
  const v = el.getAttribute(name) ?? "";
  const [val, setVal] = useState(v);
  useEffect(() => setVal(el.getAttribute(name) ?? ""), [el, name, v]);
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Input
        className="mt-1 h-8"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => { if (val !== el.getAttribute(name)) mutate(id, () => el.setAttribute(name, val)); }}
      />
    </label>
  );
}

function RtfField({ id, el, name }: { id: number; el: Element; name: string }) {
  const raw = el.getAttribute(name) ?? "";
  const initial = rtfToText(raw);
  const [val, setVal] = useState(initial);
  useEffect(() => setVal(rtfToText(el.getAttribute(name) ?? "")), [el, name, raw]);
  return (
    <label className="block">
      <span className="text-xs text-muted-foreground">{attrLabel(name)}{isRtf(raw) && " · testo formattato"}</span>
      <Textarea
        className="mt-1 min-h-28 font-sans text-sm leading-relaxed"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => { if (val !== initial) mutate(id, () => el.setAttribute(name, val.trim() ? textToRtf(val) : "")); }}
      />
    </label>
  );
}

function ArchiveBar({ id, el }: { id: number; el: Element }) {
  const kind = KIND_FOR_TAG[el.tagName];
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  if (!kind || el.getAttribute("IsRoot") === "true") return null;

  const save = async () => {
    const fields: Record<string, string> = {};
    for (const a of Array.from(el.attributes)) {
      if (HIDDEN_ATTRS.has(a.name) && a.name !== "Titolo") continue;
      fields[a.name] = a.value;
    }
    const name = el.getAttribute("RagSociale") || [el.getAttribute("PersNome"), el.getAttribute("PersCogn")].filter(Boolean).join(" ") || titleOf(el);
    await addToArchive({ kind, name: name.trim(), fields });
    toast.success("Salvato in archivio", { description: name });
  };
  const apply = (e: ArchiveEntry) => {
    mutate(id, () => {
      for (const [k, v] of Object.entries(e.fields)) if (el.hasAttribute(k) && !HIDDEN_ATTRS.has(k)) el.setAttribute(k, v);
      if (e.fields["Titolo"] && kind === "fase") el.setAttribute("Titolo", e.fields["Titolo"]);
    });
    toast.success("Dati compilati dall'archivio");
  };
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" variant="secondary" onClick={() => void save()}><Save className="h-3.5 w-3.5" />Salva in archivio</Button>
      <Popover onOpenChange={(o) => { if (o) void listArchive().then((a) => setEntries(a.filter((x) => x.kind === kind))); }}>
        <PopoverTrigger asChild><Button size="sm" variant="outline"><Download className="h-3.5 w-3.5" />Compila da archivio</Button></PopoverTrigger>
        <PopoverContent className="max-h-72 w-72 overflow-y-auto p-1">
          {entries.length === 0 && <p className="p-2 text-sm text-muted-foreground">Archivio vuoto per questo tipo.</p>}
          {entries.map((e) => (
            <button key={e.id} onClick={() => apply(e)} className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted">{e.name}</button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}
