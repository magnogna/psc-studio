import { toast } from "sonner";
import { CapacityError } from "@/lib/dsf2/container";
import { downloadBytes, exportFile } from "@/lib/dsf2/store";

export function saveDsf2(name: string) {
  try {
    const bytes = exportFile();
    const out = name.toLowerCase().endsWith(".dsf2") ? name : `${name}.dsf2`;
    downloadBytes(bytes, out);
    toast.success("File .dsf2 salvato", { description: "Il file è stato riaperto e controllato prima del download." });
  } catch (e) {
    toast.error(e instanceof CapacityError ? "Testo troppo lungo" : "Salvataggio non riuscito", {
      description: e instanceof Error ? e.message : String(e),
    });
  }
}
