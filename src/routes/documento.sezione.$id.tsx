import { createFileRoute } from "@tanstack/react-router";
import { SectionEditor } from "@/components/dsf2/SectionEditor";
import { getDoc, useDoc } from "@/lib/dsf2/store";

export const Route = createFileRoute("/documento/sezione/$id")({
  head: () => ({ meta: [{ title: "Capitolo — Cantiere PSC" }, { name: "description", content: "Modifica un capitolo del documento .dsf2." }, { property: "og:title", content: "Capitolo — Cantiere PSC" }, { property: "og:description", content: "Modifica un capitolo del documento." }] }),
  component: SectionPage,
});

function SectionPage() {
  const { id } = Route.useParams();
  const { file } = useDoc();
  const sec = file?.sections.find((s) => s.id === Number(id));
  if (!sec) return <p className="text-muted-foreground">Sezione non trovata.</p>;
  let root: Element | null = null;
  let err = "";
  try { root = getDoc(sec.id); } catch (e) { err = e instanceof Error ? e.message : String(e); }
  if (!root) return <p className="text-destructive">Impossibile leggere questa sezione. {err}</p>;
  return <SectionEditor key={sec.id} id={sec.id} root={root} />;
}
