# Ottimizzazioni e prossimi interventi

## Applicati il 30 settembre 2026

-   **Confronto indicizzato:** tre indici con code di occorrenze sostituiscono le ricerche ripetute. Il costo atteso è lineare nel numero di preferiti, a parità di lunghezza delle chiavi, con memoria aggiuntiva lineare. Restano ordine dei risultati, precedenza dei match esatti e gestione dei duplicati. I percorsi sono confrontati come array: `['A / B']` è diverso da `['A', 'B']`.
-   **Backup Firefox:** verifica di header, dimensione unsigned, limiti dei letterali, offset e lunghezze dei match; rifiuto di output incompleto o dati residui. Copia dei letterali con `Uint8Array.set`. Limite esplicito di 256 MiB decompressi, con messaggio di errore.
-   **JSON invalido:** errore specifico, senza ripiego sul parser HTML.
-   **Rendering dei dati importati:** escaping di URL, titoli, cartelle, date e favicon nelle tabelle. Navigazione con protocolli ammessi e apertura con `noopener,noreferrer` anche nei grafici e nei tarocchi. Gli URL originali restano nei dati e nelle esportazioni; protocolli non ammessi non vengono aperti.
-   **Verifica:** `npm test`, tramite il runner nativo Node, senza dipendenze aggiuntive.

### Misura locale

Singola esecuzione Node v25.4.0 su 10.000 URL distinti, 20 cartelle e tutti i titoli rinominati: **5.103 ms prima, 53 ms dopo** (circa 96 volte più veloce). Misura del solo algoritmo, non del caricamento o rendering nel browser; i risultati variano con macchina e dati.

## Priorità successive

Priorità

Punto osservato

Intervento proposto

Verifica di accettazione

Alta

`app.js` supera 3.600 righe; manca una verifica automatica del flusso browser

Separare controller, esportatori e stato; aggiungere test browser sui file in `esempi/`

Conversione, confronto, filtri ed esportazioni verificati sul browser

Alta

Ricerca: filtro e ordinamento a ogni input; conversioni di stringhe e percorsi ripetute

Debounce e cache delle chiavi di ricerca/ordinamento, invalidate al cambio dati

Misurare latenza con 10.000 e 50.000 preferiti; risultati invariati

Alta

Importazione, parsing e confronto avvengono sul thread della UI

Spostare parsing JSON, decompressione e confronto in un Web Worker; valutare separatamente parsing HTML

UI utilizzabile durante importazioni grandi; errori riportati correttamente

Media

Date visualizzate usate anche per ordinamento

Ordinare usando `rawAddDate`, mantenendo il formato scelto solo per la visualizzazione

Ordine cronologico uguale con formato locale e ISO

Media

Il grafo assegna gli ID durante ogni aggiornamento con un contatore azzerato; nodi espansi possono ricevere ID già esistenti

Assegnare ID una sola volta all'intera gerarchia

Espansioni ripetute mantengono tutti i nodi e collegamenti

Media

Simulazione D3 non arrestata al passaggio alla tabella; timeout di zoom non cancellato

Gestire esplicitamente il ciclo di vita del grafico

Nessun tick su grafici nascosti e nessuno zoom tardivo dopo cambio vista

Media

D3, QRious e font caricati da servizi esterni

Distribuire asset locali e bloccare versioni del server di sviluppo

Funzionamento offline e installazione riproducibile

Media

Esportazioni CSV e Markdown interpolano contenuti importati

Valutare protezione da formule CSV e escaping Markdown

Titoli con formule, parentesi e ritorni a capo esportati correttamente

Questi interventi successivi sono proposte, non modifiche già applicate. Le modifiche attuali hanno test di logica e controlli sintattici; il rendering completo dell'interfaccia non è stato verificato nel browser.