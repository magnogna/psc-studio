const CP1252: Record<number, string> = {
  0x80: "€", 0x82: "‚", 0x83: "ƒ", 0x84: "„", 0x85: "…", 0x86: "†", 0x87: "‡", 0x88: "ˆ", 0x89: "‰",
  0x8a: "Š", 0x8b: "‹", 0x8c: "Œ", 0x8e: "Ž", 0x91: "‘", 0x92: "’", 0x93: "“", 0x94: "”", 0x95: "•",
  0x96: "–", 0x97: "—", 0x98: "˜", 0x99: "™", 0x9a: "š", 0x9b: "›", 0x9c: "œ", 0x9e: "ž", 0x9f: "Ÿ",
};
const REV: Record<string, number> = Object.fromEntries(Object.entries(CP1252).map(([k, v]) => [v, Number(k)]));

const SKIP_DEST = new Set(["fonttbl", "colortbl", "stylesheet", "info", "pict", "object", "header", "footer", "generator", "listtable", "listoverridetable", "rsidtbl", "themedata", "datastore", "latentstyles", "xmlnstbl", "mmathPr"]);

export const isRtf = (s: string | null | undefined) => !!s && s.trimStart().startsWith("{\\rtf");

/** Converte RTF in testo semplice (paragrafi separati da \n). */
export function rtfToText(rtf: string): string {
  if (!isRtf(rtf)) return rtf;
  let out = "";
  const stack: { skip: boolean; uc: number }[] = [];
  let skip = false;
  let uc = 1;
  let pendingSkip = 0;
  let i = 0;
  const emit = (s: string) => {
    if (pendingSkip > 0) { pendingSkip -= 1; return; }
    if (!skip) out += s;
  };
  while (i < rtf.length) {
    const c = rtf[i]!;
    if (c === "{") { stack.push({ skip, uc }); i++; continue; }
    if (c === "}") { const s = stack.pop(); if (s) { skip = s.skip; uc = s.uc; } i++; continue; }
    if (c === "\r" || c === "\n") { i++; continue; }
    if (c !== "\\") { emit(c); i++; continue; }
    const n = rtf[i + 1];
    if (n === undefined) break;
    if (n === "\\" || n === "{" || n === "}") { emit(n); i += 2; continue; }
    if (n === "'") {
      const code = parseInt(rtf.substr(i + 2, 2), 16);
      emit(CP1252[code] ?? String.fromCharCode(code));
      i += 4; continue;
    }
    if (n === "*") { skip = true; i += 2; continue; }
    if (n === "~") { emit("\u00a0"); i += 2; continue; }
    if (n === "-" || n === "_") { i += 2; continue; }
    if (n === "\r" || n === "\n") { emit("\n"); i += 2; continue; }
    const m = /^([a-zA-Z]+)(-?\d+)? ?/.exec(rtf.slice(i + 1, i + 40));
    if (!m) { i += 2; continue; }
    const word = m[1]!;
    const arg = m[2] !== undefined ? Number(m[2]) : undefined;
    i += 1 + m[0].length;
    if (SKIP_DEST.has(word)) { skip = true; continue; }
    switch (word) {
      case "par": case "line": emit("\n"); break;
      case "tab": emit("\t"); break;
      case "cell": emit("\t"); break;
      case "row": emit("\n"); break;
      case "bullet": emit("•"); break;
      case "endash": emit("–"); break;
      case "emdash": emit("—"); break;
      case "lquote": emit("‘"); break;
      case "rquote": emit("’"); break;
      case "ldblquote": emit("“"); break;
      case "rdblquote": emit("”"); break;
      case "uc": uc = arg ?? 1; break;
      case "u": {
        let code = arg ?? 0;
        if (code < 0) code += 65536;
        emit(String.fromCharCode(code));
        pendingSkip = uc;
        break;
      }
      default: break;
    }
  }
  return out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function esc(text: string) {
  let s = "";
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (ch === "\\" || ch === "{" || ch === "}") s += "\\" + ch;
    else if (ch === "\n") s += "\\par\r\n";
    else if (ch === "\t") s += "\\tab ";
    else if (code < 128) s += ch;
    else if (REV[ch] !== undefined) s += "\\'" + REV[ch]!.toString(16);
    else if (code < 256) s += "\\'" + code.toString(16);
    else s += `\\u${code > 32767 ? code - 65536 : code}?`;
  }
  return s;
}

/** Genera un RTF semplice compatibile (Times New Roman 10pt). */
export function textToRtf(text: string): string {
  return (
    "{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0\\fnil\\fcharset0 Times New Roman;}}\r\n" +
    "\\viewkind4\\uc1\\pard\\f0\\fs20 " +
    esc(text) +
    "\\par\r\n}\r\n"
  );
}
