import { getDoc, mutate, sectionByTag } from "./store";
import { HIDDEN_ATTRS } from "./catalog";

const BLANK_TAGS = ["CollectionLavoro", "CollectionComm", "CollectionResp", "CollectionImpresa"];

/** Svuota i dati anagrafici del documento aperto, per usarlo come modello. */
export function blankFromTemplate() {
  for (const tag of BLANK_TAGS) {
    const sec = sectionByTag(tag);
    if (!sec) continue;
    const root = getDoc(sec.id);
    if (!root) continue;
    mutate(sec.id, () => {
      root.querySelectorAll("*").forEach((el) => {
        if (!el.tagName.startsWith("Item")) return;
        for (const a of Array.from(el.attributes)) {
          if (HIDDEN_ATTRS.has(a.name) || a.name === "RTF") continue;
          if (/^(true|false|\d{1,3})$/.test(a.value) && a.name !== "Cap") continue;
          a.value = "";
        }
      });
    });
  }
}
