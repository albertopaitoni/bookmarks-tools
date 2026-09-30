# Bookmarks Tools 🚀

**Bookmarks Tools** è un'applicazione web moderna, premium e completamente client-side per convertire, esplorare, analizzare e confrontare i file di preferiti HTML esportati dai principali browser web (Chrome, Firefox, Safari, Edge, DuckDuckGo).

L'interfaccia utente è progettata con un'estetica curata e futuristica (dark mode, glassmorphism, gradienti fluidi e micro-animazioni), garantendo al contempo prestazioni eccellenti e la massima riservatezza: **tutte le elaborazioni avvengono localmente nel browser e nessun dato viene inviato a server esterni**.

* * *

## 🌟 Caratteristiche Principali

### 1. Conversione Premium di Preferiti
Carica il tuo file `.html`, `.json` o `.jsonlz4` (o incolla direttamente il codice sorgente) per convertirlo istantaneamente nei seguenti formati strutturati:
- **Array JSON (Piatto)**: Un array lineare contenente tutti i preferiti con i relativi percorsi delle cartelle.
- **Albero JSON (Gerarchico)**: Struttura nidificata speculare a quella del browser.
- **Matrice CSV**: Ideale per l'importazione in fogli di calcolo come Excel o Google Sheets.
- **Markdown (Lista)**: Formato leggibile pronto per file README o note personali.
- **Tabelle SQL**: Genera automaticamente query `INSERT` pronte per database relazionali.

### 2. Struttura ad Albero & Esploratore Dati
- **Struttura ad Albero Interattiva**: Esplora le tue cartelle con funzioni di espansione/compressione globale, filtro di ricerca istantaneo e possibilità di mostrare/nascondere i link.
- **Esportazione Selettiva**: Consente di esportare e scaricare unicamente i preferiti contenuti in una specifica cartella selezionata dall'albero.
- **Visualizzatore Dati Tabellare**: Tabella paginata e ordinabile per colonna, dotata di ricerca globale rapida per trovare al volo titoli, URL o cartelle.
- **Cruscotto delle Statistiche**: Calcolo istantaneo di Preferiti Totali, Cartelle Totali, Profondità Massima dell'albero e numero di Domini Unici, con una classifica dei domini più frequenti.

### 3. Visualizzazioni Grafiche Interattive (D3.js)
- **Mappa Mentale (Grafo Force-Directed)**: Nodi di rete interattivi trascinabili che visualizzano la gerarchia di cartelle e singoli link con zoom e panning fluidi.
- **Grafico ad Anello (Sunburst Chart)**: Diagramma radiale multilivello per esplorare in modo intuitivo la proporzione e la nidificazione delle cartelle dei preferiti.
- **Tooltip e Interazioni**: Visualizzazione delle informazioni al passaggio del mouse e possibilità di includere o escludere i singoli link o resettare lo zoom.

### 4. La Macchina del Tempo (Timeline Nostalgia)
- **Analisi Temporale**: Un istogramma interattivo riassume l'attività di salvataggio dei preferiti nel corso del tempo (mesi e anni).
- **Filtro Temporale**: Isola e visualizza esclusivamente i preferiti salvati in uno specifico mese o intervallo temporale.
- **Player Automatico**: Pulsanti Play/Pausa e controlli mese per mese per avviare una riproduzione animata dei tuoi salvataggi passati.

### 5. Sezione "Esplora" (Gamification & Insights)
- **Tarocchi dei Preferiti**: Un gioco di carte interattivo per sconfiggere la sindrome del "Lo leggo dopo" (Read Later). Pesca 3 o 5 carte coperte con micro-animazioni 3D, girale e riscopri vecchi link dimenticati (con opzione per prediligere i preferiti più datati).
- **Personality Wrapped**: Uno slideshow animato (stile Spotify Wrapped) che racconta le tue abitudini digitali: il dominio più amato, il giorno/ora di picco, la complessità dell'albero e un profilo ironico di personalità generato a partire dalle tue categorie di preferiti. Include un comodo pulsante per copiare il report testuale pronto per la condivisione.

### 6. Condivisione Rapida (QR Code)
- Facendo doppio clic su un preferito nella tabella o cliccando sul relativo pulsante, si apre un popup con un codice QR generato all'istante lato client. Inquadrando lo schermo è possibile trasferire ed aprire rapidamente il link su smartphone o tablet.
- Possibilità di scaricare il codice QR come immagine PNG o copiare direttamente l'URL negli appunti.

### 7. Confronto tra File di Preferiti (Diff Tool)
Carica due file di preferiti (File A - Riferimento/Vecchio e File B - Aggiornato/Nuovo) per analizzare le differenze:
- Rilevamento automatico di preferiti **Aggiunti**, **Rimossi**, **Modificati** (cambiamento di titolo o spostamento di cartella) e **Identici**.
- Filtro interattivo del report per stato e ricerca globale all'interno delle differenze.
- Esportazione e download del report di confronto in formato **JSON**, **CSV** o **Markdown**.

### 8. Opzioni Avanzate e Privacy-First
- **Pulizia URL**: Rimuove automaticamente i parametri di tracking e referral dagli URL (ad esempio `utm_*`, `fbclid`, `ref`) prima di esportare o confrontare i dati.
- **Esclusione Icone**: Opzione per omettere i dati delle favicon base64 per velocizzare l'elaborazione dei file più pesanti.
- **Nessun Server**: Tutta la logica viene eseguita esclusivamente nel tuo browser tramite file statici, garantendo la sicurezza al 100% dei tuoi dati.

* * *

## 🛠️ Stack Tecnologico

L'applicazione è sviluppata interamente in modalità vanilla client-side per garantire caricamenti immediati:
- **Struttura**: [HTML5](https://developer.mozilla.org/it/docs/Web/HTML) semantico.
- **Stile**: [Vanilla CSS3](https://developer.mozilla.org/it/docs/Web/CSS) con variabili personalizzate, layout flessibili, glassmorphism e animazioni fluide.
- **Logica**: [JavaScript ES Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) nativo.
- **Librerie distribuite localmente (`vendor/`)**:
  - [D3.js 7.9.0](https://d3js.org/): Per il rendering del grafo a nodi e del sunburst chart.
  - [QRious 4.0.2](https://github.com/neocotic/qrious): Per la generazione dei codici QR.
- **Font**: *Outfit* per i titoli e *Inter* per il testo, distribuiti localmente insieme alle licenze di Google Fonts.

* * *

## 📁 Struttura del Progetto

```text
bookmarks-tools/
├── esempi/                       # File HTML di esempio per test e demo
│   ├── compare_example_old.html  # Versione precedente per il confronto
│   └── compare_example_new.html  # Versione aggiornata per il confronto
├── src/                          # Codice dell'applicazione
│   ├── app.js                    # Controller principale (UI e interazioni)
│   ├── state.js                  # Stato condiviso della UI
│   ├── query.js                  # Ricerca, cache e ordinamento
│   ├── parser.js                 # Parsing e formattazione dei preferiti HTML/JSON
│   ├── comparator.js             # Confronto e report diff
│   ├── processing.js             # Decodifica, parsing JSON e confronto
│   ├── processing-worker.js      # Elaborazioni fuori dal thread della UI
│   ├── worker-client.js          # Richieste al worker e fallback
│   ├── exporters.js              # Esportatori CSV, Markdown e SQL
│   ├── export-utils.js           # Escaping delle esportazioni
│   ├── dates.js                  # Formattazione date e timestamp originali
│   ├── urls.js                   # Validazione e apertura dei link
│   ├── visualization.js          # Grafici interattivi D3.js
│   └── styles/
│       └── style.css             # Stili, layout e animazioni
├── docs/
│   └── MIGLIORAMENTI.md          # Interventi applicati e margini residui
├── tests/                        # Test di regressione
├── scripts/                      # Strumenti di sviluppo e verifica
│   ├── dev-server.js             # Server locale Node senza dipendenze
│   ├── browser-smoke.js          # Verifica completa nel browser
│   └── benchmark.js              # Misure delle prestazioni
├── vendor/                       # Librerie, font e relative licenze
├── index.html                    # Pagina principale e struttura dell'applicazione
├── package.json                  # Script e configurazione per il server di sviluppo locale
├── package-lock.json             # Versioni delle dipendenze di sviluppo
└── README.md                     # Questo file di documentazione
```

* * *

## 🚀 Come Avviare Localmente

Per eseguire e testare l'applicazione sul proprio computer, assicurarsi di aver installato [Node.js](https://nodejs.org/) e seguire questi passaggi:

1. **Clona la cartella del progetto o posizionati al suo interno**:
   ```bash
   cd bookmarks-tools
   ```

2. **Avvia il server di sviluppo** (Node.js 22 o successivo; nessuna installazione richiesta):
   ```bash
   npm run dev
   ```

3. **Apri il browser** all'indirizzo [http://127.0.0.1:3000](http://127.0.0.1:3000).

Librerie e font sono locali: l'applicazione funziona anche senza accesso ai CDN. Il server ascolta solo su loopback. Per usare un'altra porta, imposta la variabile `PORT`.

## Verifiche

```bash
npm test
npm run benchmark
```

Per il test completo nel browser, installa la dipendenza di sviluppo fissata nel lockfile e Chromium:

```bash
npm ci
npx playwright install chromium
npm run test:browser
```

Su Windows puoi usare Edge già installato, evitando il download di Chromium:

```powershell
npm ci
$env:BROWSER_CHANNEL = 'msedge'
npm run test:browser
```

Il test browser avvia e chiude da solo un server su una porta libera. Verifica gli esempi HTML, importazione JSON, filtri, esportazioni, date, grafici, QR e Web Worker, bloccando le richieste esterne. `PLAYWRIGHT_MODULE_PATH` permette di usare una distribuzione di Playwright già disponibile nell'ambiente.

Parsing JSON, decompressione Firefox e confronto vengono eseguiti in un Web Worker. Il parsing HTML resta nel thread principale, dove è disponibile `DOMParser`. Se il worker non è disponibile, viene usata la stessa logica nel thread principale.

Le esportazioni CSV neutralizzano i valori interpretabili come formule anteponendo un apostrofo. Markdown esegue l'escaping di titoli e cartelle e rende i protocolli non ammessi come testo semplice. JSON mantiene i dati originali.

* * *

## 🔒 Sicurezza e Privacy

Bookmarks Tools rispetta la tua privacy. Il codice è eseguito interamente sul client (nel tuo browser). Nessuno dei tuoi preferiti o dei report di confronto viene mai caricato su server remoti, rendendo lo strumento sicuro anche per l'uso con dati aziendali o sensibili.
