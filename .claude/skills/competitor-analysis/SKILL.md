---
name: competitor-analysis
description: Analisi comparativa di contenuti e messaging tra il sito di un cliente e 3-4 competitor diretti, con report finale in Word contenente insight strategici e raccomandazioni. Usa questa skill ogni volta che l'utente chiede un'analisi competitor, un confronto tra siti web, un audit di posizionamento/messaging, o un report comparativo per un cliente dell'agenzia — anche se non usa esplicitamente le parole "competitor analysis".
---

# Competitor Analysis (Content & Messaging)

Skill per produrre un report comparativo professionale tra il sito di un cliente e i suoi competitor diretti, focalizzato su **contenuti e messaging** (tone of voice, USP, CTA, value proposition, target).

## Quando usarla
Attivare quando l'utente:
- chiede di confrontare il sito di un cliente con quello di competitor
- chiede un audit di posizionamento o messaging
- chiede un "report competitor" o "analisi comparativa" per un cliente dell'agenzia
- fornisce una lista di URL (1 principale + alcuni competitor) chiedendo un'analisi

## Input richiesti
Prima di iniziare, assicurati di avere:

1. **URL del sito cliente** (obbligatorio)
2. **URL di 3-4 competitor diretti** (obbligatorio — se l'utente ne dà meno o di più va bene comunque, ma segnala se ne mancano)
3. **Contesto minimo sul cliente** (se disponibile, altrimenti procedi comunque e segnalalo come limite nel report):
   - settore / prodotto o servizio
   - target di riferimento
   - obiettivo del progetto (riposizionamento, nuova campagna, audit generale, ecc.)

Se mancano completamente URL competitor o il sito cliente, chiedili prima di procedere — non inventare competitor. Se manca solo il contesto (settore/target/obiettivo), procedi comunque con l'analisi e nota esplicitamente nel report che alcune valutazioni sono fatte senza contesto cliente confermato.

## Workflow

### 1. Raccolta dati
Usa `web_fetch` per leggere il contenuto reale di ciascun sito (homepage + 1-2 pagine chiave se accessibili, es. "chi siamo" o pagina prodotto principale). Non basarti su conoscenza pregressa dei brand: leggi i siti effettivi.

### 2. Analisi per singola azienda (cliente + ogni competitor)
Per ciascun sito valuta questi assi, in modo oggettivo e supportato da esempi concreti trovati sul sito:

- **Value proposition / USP**: cosa promette il brand, cosa lo differenzia (dichiarato esplicitamente sul sito)
- **Tone of voice**: registro (formale/informale, tecnico/emotivo, autorevole/amichevole), con 1-2 esempi di frasi rappresentative parafrasate (mai citazioni dirette lunghe, per rispetto del copyright — riformula sempre con parole tue)
- **Target implicito**: a chi si rivolge il linguaggio/contenuto (B2B/B2C, livello di expertise presupposto, ecc.)
- **CTA principali**: quali azioni spinge il sito (richiedi demo, acquista, contattaci, iscriviti...)
- **Struttura dei contenuti**: come organizza le informazioni (storytelling, feature-first, social proof, dati/numeri, testimonianze)

### 3. Matrice comparativa
Costruisci una tabella comparativa con le aziende in riga e gli assi del punto 2 in colonna, per rendere immediati i confronti visivi.

### 4. Gap analysis e insight
Identifica pattern trasversali:
- Cosa fanno TUTTI i competitor che il cliente non fa (rischio: sembrare indietro)
- Cosa fa SOLO il cliente (potenziale differenziatore da valorizzare, o rischio di essere fuori standard)
- Spazi di posizionamento non presidiati da nessuno (opportunità)

### 5. Raccomandazioni strategiche
3-5 raccomandazioni concrete e azionabili per il cliente, ciascuna collegata esplicitamente a un insight emerso nel punto 4 (evita raccomandazioni generiche scollegate dai dati raccolti).

### 6. Generazione report Word
**Prima di generare il documento, consulta e segui `/mnt/skills/public/docx/SKILL.md`** per le convenzioni corrette di creazione file .docx in questo ambiente.

Struttura del report:
1. Copertina (cliente, data, "Analisi Comparativa Competitor")
2. Executive summary (max 1 pagina: 3-4 insight principali + raccomandazione top)
3. Metodologia (siti analizzati, data di rilevazione, eventuali limiti — es. contesto cliente mancante)
4. Profili individuali (una sezione per azienda, cliente incluso)
5. Matrice comparativa (tabella)
6. Gap analysis e insight chiave
7. Raccomandazioni strategiche (elenco numerato, azionabile)
8. Appendice: elenco URL analizzati con data

Salva il file in `/mnt/user-data/outputs/` e presentalo con `present_files`.

## Vincoli e buone pratiche
- Non riprodurre mai testo copiato letteralmente dai siti analizzati: parafrasa sempre (vedi regole copyright).
- Se un sito non è raggiungibile via `web_fetch`, segnalalo nel report invece di inventare contenuti.
- Mantieni un tono professionale da consulente di agenzia: diretto, basato sui dati, senza giudizi soggettivi non supportati da esempi concreti.
- Se il cliente ha già un `brand-voice-profile` salvato in una skill separata, usa quei dati per il profilo cliente invece di dedurli solo dal sito.
