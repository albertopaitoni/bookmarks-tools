# Ottimizzazioni e prossimi interventi

## Applicati il 30 settembre 2026

-   **Confronto indicizzato:** tre indici con code di occorrenze sostituiscono le ricerche ripetute. Il costo atteso è lineare nel numero di preferiti, a parità di lunghezza delle chiavi, con memoria aggiuntiva lineare. Restano ordine dei risultati, precedenza dei match esatti e gestione dei duplicati. I percorsi sono confrontati come array: `['A / B']` è diverso da `['A', 'B']`.
-   **Backup Firefox:** verifica di header, dimensione unsigned, limiti dei letterali, offset e lunghezze dei match; rifiuto di output incompleto o dati residui. Copia dei letterali con `Uint8Array.set`. Limite esplicito di 256 MiB decompressi, con messaggio di errore.
-   **JSON invalido:** errore specifico, senza ripiego sul parser HTML.
-   **Rendering dei dati importati:** escaping di URL, titoli, cartelle, date e favicon nelle tabelle. Navigazione con protocolli ammessi e apertura con `noopener,noreferrer` anche nei grafici e nei tarocchi. Gli URL originali restano nei dati e nelle esportazioni; protocolli non ammessi non vengono aperti.
-   **Verifica:** `npm test`, tramite il runner nativo Node, senza dipendenze aggiuntive.

### Misura locale

Singola esecuzione Node v25.4.0 su 10.000 URL distinti, 20 cartelle e tutti i titoli rinominati: **5.103 ms prima, 53 ms dopo** (circa 96 volte più veloce). Misura del solo algoritmo, non del caricamento o rendering nel browser; i risultati variano con macchina e dati.

## Secondo ciclo completato il 30 settembre 2026

| Intervento | Risultato |
| --- | --- |
| Ricerca | Debounce di 150 ms per tabella, albero e confronto; chiavi di ricerca memorizzate e ordinamento riutilizzato. La cache si aggiorna quando vengono sostituiti i dati o cambia l'ordinamento. |
| Date | Ordinamento dal timestamp originale, identico nei formati ISO, locale e Unix; date assenti o invalide collocate insieme. |
| Elaborazioni | Decodifica dei file, decompressione Firefox, parsing JSON e confronto in un Web Worker con fallback. Richieste concorrenti associate tramite ID; risultati obsoleti non sostituiscono quelli di un'elaborazione più recente. |
| Grafici | ID univoci assegnati prima del collasso; simulazione, transizioni e timer di zoom arrestati quando il grafico è nascosto. Corretto il Sunburst che usava l'inesistente `d3.scaleRainbow()`. |
| Esportazioni | Protezione dalle formule CSV, escaping Markdown e URL tra parentesi angolari; funzioni di esportazione e date separate dal controller. |
| Struttura | Stato spostato in `state.js`; moduli dedicati a query, elaborazioni, worker ed esportatori. |
| Asset e sviluppo | D3 7.9.0, QRious 4.0.2 e font locali con licenze; server di sviluppo nativo Node senza download all'avvio. Playwright fissato e lockfile per i test browser. |

### Verifica

- **21 test** con `npm test`: regressioni precedenti, filtri combinati, cronologia, duplicati, esportazioni, fallback del worker e server locale.
- **Test browser su Edge**: conversione degli esempi HTML, importazione Chrome JSON, confronto, ricerca, download, esportazioni, formato date, espansione del grafo, Sunburst, QR e worker reale. Richieste esterne bloccate; nessun errore JavaScript.
- **Benchmark ripetibile** con `npm run benchmark`: 50 ricerche su 10.000 e 50.000 preferiti. In una misura locale: 203,6 → 112 ms e 634,3 → 408 ms, più preparazione iniziale di 23,9 e 129,2 ms. Misura della logica, senza rendering; prestazioni dipendenti da macchina, dati e query.

### Margini residui

- Il parsing HTML usa ancora `DOMParser` sul thread principale. Anche rendering dell'albero, statistiche ed esportazioni complete possono richiedere tempo con raccolte molto grandi: il worker riduce il blocco delle elaborazioni supportate, non elimina ogni possibile rallentamento della UI.
- I controller di timeline ed esplorazione sono ancora in `app.js`; ulteriori estrazioni possono essere fatte per funzionalità, mantenendo i test browser.
- Il test browser copre Edge/Chromium; Safari e Firefox richiedono una verifica dedicata.
