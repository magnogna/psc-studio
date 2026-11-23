export interface Group {
  key: string;
  label: string;
  tags: string[];
}

export const GROUPS: Group[] = [
  { key: "anagrafica", label: "Anagrafica", tags: ["CollectionLavoro", "CollectionComm", "CollectionResp", "CollectionImpresa", "CollectionZone", "Organigramma"] },
  { key: "documentazione", label: "Documentazione", tags: ["DocumentazioneVaria", "CollectionDocumentazione", "CollectionDesAreaCantiere", "CollectionDesLavori", "CollectionOprPrvMacImp", "CollectionMtrPericolose"] },
  { key: "psc", label: "Piano di sicurezza", tags: ["AreaCantiere", "CollectionOrganizCnt", "CollectionCoordinamentoGen", "CollectionFormazioneLav", "CollectionMisureGenSicurezza", "CollectionLvCoord", "CollectionCoordGuidato", "CollectionConclusioniGen"] },
  { key: "lavorazioni", label: "Lavorazioni", tags: ["CollectionLavorazioni", "CollectionLavoratori", "CollectionMacchine", "CollectionAttrezzi", "CollectionRischi", "CollectionPrevenzioni", "CollectionSegnaletica"] },
  { key: "fascicolo", label: "Fascicolo dell'opera", tags: ["CollectionCorpoOpera", "CollectionUnitaTecnlogica", "CollectionElementoManut", "CollectionInterventi", "CollectionMisurePreventiveOP", "CollectionDocumentiAllegati"] },
  { key: "procedure", label: "Procedure", tags: ["CollectionPcdLavStrada", "CollectionPcdCopertura", "CollectionPcdEmergenza", "CollectionPcdDUVRI", "CollectionSchedeCOVID19", "Vigilanza", "CollectionRevisioniFE"] },
];

export const TAG_GROUP = new Map(GROUPS.flatMap((g) => g.tags.map((t) => [t, g.key] as const)));

export const HIDDEN_ATTRS = new Set([
  "IdOD", "IdND", "IdPrnt", "TpPrnt", "IdOrdine", "Tp", "IsRoot", "IsCartella", "CRC", "CountId", "Titolo",
  "TagSearch", "FlagFiltro", "IdImpresa", "IdZona", "CodiceFase", "DefaultCustom", "ColorTxt", "Divisa",
]);

const LABELS: Record<string, string> = {
  RagSociale: "Ragione sociale", Indir: "Indirizzo", Cap: "CAP", Citta: "Città", Prv: "Provincia", Tel: "Telefono",
  Fax: "Fax", PersNome: "Nome", PersCogn: "Cognome", PersQalif: "Qualifica", PersIndir: "Indirizzo (persona)",
  PersCAP: "CAP (persona)", PersCitta: "Città (persona)", PerPrv: "Provincia (persona)", PersTel: "Telefono (persona)",
  PersFax: "Fax (persona)", PerPI: "Partita IVA", PerCF: "Codice fiscale", NatOper: "Natura dell'opera",
  Imp: "Importo (€)", Ogg: "Oggetto", DtInzLa: "Inizio lavori", DFinLa: "Fine lavori", DuGG: "Durata (giorni)",
  NImpr: "N. imprese", NAut: "N. lavoratori autonomi", NLavo: "N. lavoratori", UoGG: "Uomini-giorno",
  DtInizio: "Data inizio", Durata: "Durata (giorni)", Colore: "Colore", DannoPro: "Probabilità", DannoEnt: "Entità del danno",
  RTF: "Testo", DesAttivita: "Descrizione attività", ModOrganiz: "Modalità organizzative", TurniLavoro: "Turni di lavoro",
  TpConc: "Tipo concessione", NConc: "N. concessione", DtConc: "Data concessione", Email: "Email", PEC: "PEC",
};

export function attrLabel(name: string) {
  if (LABELS[name]) return LABELS[name];
  return name.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^Is /, "");
}

export const PROB = ["Improbabile", "Poco probabile", "Probabile", "Molto probabile"];
export const ENT = ["Lieve", "Significativo", "Grave", "Gravissimo"];
/** Matrice del rischio CerTus: R = P x E (valori 1-4); nel file P ed E sono salvati come 0-3. */
export function riskLevel(p: number, e: number) {
  const r = (p + 1) * (e + 1);
  if (r >= 12) return { r, label: "Alto", tone: "high" as const };
  if (r >= 8) return { r, label: "Rilevante", tone: "high" as const };
  if (r >= 6) return { r, label: "Medio", tone: "mid" as const };
  if (r >= 3) return { r, label: "Moderato", tone: "mid" as const };
  return { r, label: "Basso", tone: "low" as const };
}

export const toneCls = { low: "bg-risk-low text-ink", mid: "bg-risk-mid text-ink", high: "bg-risk-high text-primary-foreground" } as const;
