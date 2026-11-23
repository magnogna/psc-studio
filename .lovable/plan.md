# Editor PSC per file .dsf2 (alternativa a CerTus)

## Cosa ho scoperto nel file di esempio
Il file `EDILMETAL_VIGEVANO.dsf2` è un contenitore che raccoglie molti documenti XML compressi (circa 53 sezioni): Anagrafica, Lavoro, Committenti, Responsabili, Imprese, Zone, Organigramma, Area cantiere, Organizzazione cantiere, Coordinamento, Conclusioni, Fascicolo e altre. I testi lunghi sono in formato RTF, dentro l'XML. Riesco già a leggerne il contenuto. Per riscriverlo devo prima capire bene come è organizzato l'indice interno del file.

## Cosa farà l'app (uso personale, solo file locali, nessun account)
1. **Apri file .dsf2**: lo trascini nella pagina e l'app lo legge direttamente nel browser. Il file non viene inviato da nessuna parte.
2. **Navigazione a capitoli**: un indice laterale come in CerTus (Anagrafica, Area cantiere, Organizzazione, Lavorazioni, Coordinamento, Fascicolo…).
3. **Modifica dei dati**:
   - Anagrafica: committenti, responsabili e imprese, con moduli a campi.
   - Testi descrittivi (RTF): editor di testo con grassetto, elenchi e altra formattazione di base.
   - Fascicolo dell'opera: le schede degli interventi di manutenzione.
   - Cronoprogramma: un diagramma di Gantt interattivo con le fasi, le date e le durate.
4. **Salva come .dsf2**: ricostruisce il file nello stesso formato e lo scarica.
5. **Esporta PDF** del PSC, del Fascicolo e del Gantt.

## Fasi
- **Fase 1:** lettore completo e visualizzazione di tutte le sezioni (rischio basso).
- **Fase 2:** modifica e salvataggio .dsf2. Ogni salvataggio viene verificato riaprendo il file appena creato. Va confermato aprendo il file in CerTus.
- **Fase 3:** Gantt ed esportazione PDF.

## Limiti da sapere
- Il formato non è documentato. Con un solo file di esempio alcune sezioni potrebbero non essere interpretate del tutto. Altri file, soprattutto con Gantt pieni, aiuterebbero.
- Le sezioni che l'app non capisce restano intatte nel file, così non si perde nulla.

## Dettagli tecnici
- Parser binario lato client: header `AAMVHFSS` e directory a record fissi (nome, offset, dimensione), con stream zlib per ogni voce. La decompressione si fa con `pako` / DecompressionStream.
- XML convertito in un modello tipizzato con DOMParser. I nodi sconosciuti vengono conservati per un salvataggio senza perdite.
- RTF: conversione RTF ⇄ HTML per l'editor (Tiptap).
- Writer: ricompressione e ricostruzione dell'indice, con un test che apre il file, lo salva e verifica che i dati restino identici.
- Gantt: componente su misura in SVG. PDF generato nel browser.
- Stato e bozze salvati nel browser (IndexedDB). Nessun servizio online.
