---
name: site-builder
description: "Use this skill whenever the user wants to build a website or landing page from scratch starting from a description or brief — not by cloning an existing site. Triggers on requests like 'costruisci un sito per…', 'crea una landing page', 'build me a website for my business', 'genera un sito da questa descrizione'. Drives a staged, checkpoint-based process (brief → sitemap → design system → build → browser verification → optional deploy) where the user reviews and approves each stage before the next. Pairs with the frontend-design, brand-guidelines, web-artifacts-builder and webapp-testing skills. Do NOT use for cloning an existing URL, for editing an already-built site's minor copy, or when the user explicitly wants a one-shot single-file page with no review loop."
---

# Site Builder — costruzione siti a stadi verificabili

Costruisci un sito **da zero, partendo da una descrizione**, procedendo per fasi.
La regola d'oro: **non passare mai alla fase successiva senza mostrare l'output
della fase corrente e ottenere l'ok dell'utente.** L'utente deve poter vedere e
correggere l'andamento a ogni passaggio, non ricevere un risultato unico alla fine.

## Skill da combinare
- `frontend-design` → direzione visiva, tipografia, scelte non-template
- `brand-guidelines` → applicare colori/tipografia del brand quando esiste
- `web-artifacts-builder` → costruire l'UI (React/Tailwind/shadcn per siti complessi)
- `webapp-testing` → aprire il sito nel browser, screenshot e verifica reale

## Le fasi (ognuna con checkpoint)

### Fase 0 — Brief
Fai al massimo 4–6 domande mirate, poi fermati:
1. Attività / prodotto e in una frase cosa fa
2. Obiettivo del sito (vendere, prenotazioni, contatti, portfolio, informare)
3. Pagine o sezioni desiderate
4. Tono e stile visivo (elegante, minimale, energico, ecc.) + eventuali riferimenti
5. Lingua/e e pubblico
6. Vincoli tecnici (statico vs app, dominio, hosting, deve girare offline?)

Se l'utente ha già dato la descrizione, estrai le risposte da lì e chiedi solo
ciò che manca. **CHECKPOINT: riepiloga il brief in 5 righe e chiedi conferma.**

### Fase 1 — Struttura (sitemap + wireframe testuale)
Produci una sitemap e, per ogni pagina, un wireframe **a parole** (ordine delle
sezioni, cosa contiene ciascuna, CTA). Nessun codice ancora.
**CHECKPOINT: mostra la struttura e chiedi approvazione/modifiche.**

### Fase 2 — Design system
Definisci palette (con codici hex), scala tipografica, spaziature, componenti
base e tono delle immagini. Usa `frontend-design`; se esiste un brand, `brand-guidelines`.
Presenta il design system in modo compatto (una tabella + 2 righe di motivazione).
**CHECKPOINT: l'utente approva la direzione visiva prima di scrivere UI.**

### Fase 3 — Build incrementale
Costruisci **una pagina/sezione alla volta**, non tutto insieme. Per siti
statici semplici: HTML/CSS puliti. Per UI ricche/multi-componente: `web-artifacts-builder`.
Dopo ogni sezione significativa, vai alla Fase 4 di verifica invece di accumulare.

### Fase 4 — Verifica nel browser
Con `webapp-testing` (Playwright): avvia/serve il sito, cattura screenshot alle
risoluzioni desktop e mobile, controlla console/log per errori, verifica i link
e le CTA. **Mostra gli screenshot all'utente** — questo è "l'andamento per passaggi".
**CHECKPOINT: l'utente vede il rendering reale e approva o chiede fix.**
Itera Fase 3 ↔ Fase 4 finché la sezione è ok, poi passa alla successiva.

### Fase 5 — Deploy (opzionale)
Solo se richiesto. Prima riepiloga cosa verrà pubblicato e dove. Le pubblicazioni
sono difficili da annullare: **conferma esplicita prima di pubblicare.**

## Principi
- Un blocco unico alla fine è un fallimento del processo: mostra sempre stadi intermedi.
- Preferisci codice pulito e leggibile a boilerplate generato.
- Verifica nel browser, non solo "sembra giusto": screenshot reali a ogni tappa.
- Non inventare contenuti sensibili (recensioni, dati, loghi altrui) spacciandoli per veri.
- Tieni un breve changelog delle decisioni prese, così l'utente può tornare indietro.
