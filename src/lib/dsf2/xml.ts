/** Parsing/serializzazione delle sezioni XML preservando i ritorni a capo negli attributi. */
export function parseSectionXml(xml: string): Element {
  const safe = xml.replace(/="([^"]*)"/g, (_m, v: string) =>
    `="${v.replace(/\r/g, "&#13;").replace(/\n/g, "&#10;").replace(/\t/g, "&#9;")}"`,
  );
  const doc = new DOMParser().parseFromString(`<dsfwrap>${safe}</dsfwrap>`, "application/xml");
  const err = doc.getElementsByTagName("parsererror")[0];
  if (err) throw new Error("XML non valido: " + err.textContent);
  return doc.documentElement;
}

export function serializeSectionXml(wrapper: Element): string {
  const ser = new XMLSerializer();
  let out = "";
  wrapper.childNodes.forEach((n) => {
    out += ser.serializeToString(n);
  });
  // ripristina lo stile ACCA
  return out
    .replace(/ xmlns="[^"]*"/g, "")
    .replace(/&#13;|&#xD;/gi, "\r")
    .replace(/&#10;|&#xA;/gi, "\n")
    .replace(/&#9;|&#x9;/gi, "\t");
}

export const childElements = (el: Element) => Array.from(el.children);
