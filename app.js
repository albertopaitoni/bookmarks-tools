/**
 * app.js
 * Controller per la gestione dell'interfaccia utente, del flusso di lavoro
 * e delle esportazioni del convertitore di preferiti bookmarks tools.
 */

import { parseBookmarks, flattenBookmarks } from './parser.js';
import { compareBookmarks, generateCompareCSV, generateCompareMarkdown } from './comparator.js';

// --- STATO DELL'APPLICAZIONE ---
let appState = {
  currentMode: 'convert', // convert or compare
  
  // Modalità Convertitore
  originalHtml: '',
  parsedTree: [],
  flatBookmarks: [],
  filteredBookmarks: [],
  
  // Tabella paginata convertitore
  currentPage: 1,
  itemsPerPage: 15,
  searchQuery: '',
  activeFolderFilter: null, // array representing path or null
  sortColumn: 'idx',
  sortDirection: 'asc',
  
  // Esportazioni convertitore
  currentExportFormat: 'json-flat',
  excludeIcons: true,
  dateFormat: 'iso', // iso, unix, locale
  exportOnlyFolder: false, // esporta solo cartella visualizzata

  // Stato Albero
  showLinksInTree: false,
  treeSearchQuery: '',

  // Modalità Confrontatore
  fileA: { name: '', size: 0, rawHtml: '', parsedTree: [], flatBookmarks: [] },
  fileB: { name: '', size: 0, rawHtml: '', parsedTree: [], flatBookmarks: [] },
  compareExcludeIcons: true,
  compareDateFormat: 'iso',
  comparisonResults: null,
  filteredCompareList: [],
  compareCurrentFilter: 'all', // all, added, removed, modified, identical
  compareCurrentPage: 1,
  compareItemsPerPage: 15,
  compareSearchQuery: '',
  compareExportFormat: 'json', // json, csv, markdown
};

// --- DOM ELEMENTS ---
const elements = {
  // Input
  btnModeFile: document.getElementById('btn-mode-file'),
  btnModeText: document.getElementById('btn-mode-text'),
  dropZone: document.getElementById('drop-zone'),
  fileInput: document.getElementById('file-input'),
  selectedFileInfo: document.getElementById('selected-file-info'),
  pasteContainer: document.getElementById('paste-container'),
  textPaste: document.getElementById('text-paste'),
  
  // Opzioni
  optExcludeIcons: document.getElementById('opt-exclude-icons'),
  optDateFormat: document.getElementById('opt-date-format'),
  
  // Azioni
  btnProcess: document.getElementById('btn-process'),
  btnLoadExample: document.getElementById('btn-load-example'),
  
  // Loader
  appLoader: document.getElementById('app-loader'),
  loaderMessage: document.getElementById('loader-message'),
  
  // Risultati
  resultsContainer: document.getElementById('results-container'),
  
  // Statistiche
  statBookmarks: document.getElementById('stat-bookmarks'),
  statFolders: document.getElementById('stat-folders'),
  statDepth: document.getElementById('stat-depth'),
  statDomains: document.getElementById('stat-domains'),
  
  // Sidebar
  treeRootView: document.getElementById('tree-root-view'),
  domainListView: document.getElementById('domain-list-view'),
  
  // Tabella
  tableSearch: document.getElementById('table-search'),
  tableBody: document.getElementById('table-body'),
  tableRangeStart: document.getElementById('table-range-start'),
  tableRangeEnd: document.getElementById('table-range-end'),
  tableTotalCount: document.getElementById('table-total-count'),
  btnPagePrev: document.getElementById('btn-page-prev'),
  btnPageNext: document.getElementById('btn-page-next'),
  pageNumbers: document.getElementById('page-numbers'),
  tableHeaders: document.querySelectorAll('#bookmarks-table th'),
  
  // Esportazione
  exportTabs: document.querySelectorAll('.btn-tab'),
  exportFilename: document.getElementById('export-filename'),
  codeOutputText: document.getElementById('code-output-text'),
  btnCopyCode: document.getElementById('btn-copy-code'),
  btnDownloadCode: document.getElementById('btn-download-code'),
  exportScopeBanner: document.getElementById('export-scope-banner'),
  exportScopeFolderName: document.getElementById('export-scope-folder-name'),
  optExportOnlyFolder: document.getElementById('opt-export-only-folder'),

  // Elementi Albero
  treeSearchInput: document.getElementById('tree-search-input'),
  btnTreeExpandAll: document.getElementById('btn-tree-expand-all'),
  btnTreeCollapseAll: document.getElementById('btn-tree-collapse-all'),
  optTreeShowLinks: document.getElementById('opt-tree-show-links'),

  // Selettori di Modalità dell'App
  modeConvertTab: document.getElementById('mode-convert-tab'),
  modeCompareTab: document.getElementById('mode-compare-tab'),
  
  // Container di visualizzazione
  convertUploadContainer: document.getElementById('convert-upload-container'),
  compareUploadContainer: document.getElementById('compare-upload-container'),
  compareResultsContainer: document.getElementById('compare-results-container'),
  
  // Caricamento File A (Vecchio)
  btnCompareModeFileA: document.getElementById('btn-compare-mode-file-a'),
  btnCompareModeTextA: document.getElementById('btn-compare-mode-text-a'),
  dropZoneA: document.getElementById('drop-zone-a'),
  fileInputA: document.getElementById('file-input-a'),
  selectedFileInfoA: document.getElementById('selected-file-info-a'),
  pasteContainerA: document.getElementById('paste-container-a'),
  textPasteA: document.getElementById('text-paste-a'),
  
  // Caricamento File B (Nuovo)
  btnCompareModeFileB: document.getElementById('btn-compare-mode-file-b'),
  btnCompareModeTextB: document.getElementById('btn-compare-mode-text-b'),
  dropZoneB: document.getElementById('drop-zone-b'),
  fileInputB: document.getElementById('file-input-b'),
  selectedFileInfoB: document.getElementById('selected-file-info-b'),
  pasteContainerB: document.getElementById('paste-container-b'),
  textPasteB: document.getElementById('text-paste-b'),
  
  // Opzioni Confronto
  optCompareExcludeIcons: document.getElementById('opt-compare-exclude-icons'),
  optCompareDateFormat: document.getElementById('opt-compare-date-format'),
  
  // Pulsanti Azioni Confronto
  btnLoadCompareExample: document.getElementById('btn-load-compare-example'),
  btnCompare: document.getElementById('btn-compare'),
  
  // Statistiche Confronto
  statCompareAdded: document.getElementById('stat-compare-added'),
  statCompareRemoved: document.getElementById('stat-compare-removed'),
  statCompareModified: document.getElementById('stat-compare-modified'),
  statCompareIdentical: document.getElementById('stat-compare-identical'),
  
  // Tabella Differenze
  compareTableSearch: document.getElementById('compare-table-search'),
  compareFilterTabs: document.getElementById('compare-filter-tabs'),
  cntAll: document.getElementById('cnt-all'),
  cntAdded: document.getElementById('cnt-added'),
  cntRemoved: document.getElementById('cnt-removed'),
  cntModified: document.getElementById('cnt-modified'),
  cntIdentical: document.getElementById('cnt-identical'),
  compareTableBody: document.getElementById('compare-table-body'),
  compareRangeStart: document.getElementById('compare-range-start'),
  compareRangeEnd: document.getElementById('compare-range-end'),
  compareTotalCount: document.getElementById('compare-total-count'),
  btnComparePagePrev: document.getElementById('btn-compare-page-prev'),
  btnComparePageNext: document.getElementById('btn-compare-page-next'),
  comparePageNumbers: document.getElementById('compare-page-numbers'),
  
  // Esportazione Report Differenze
  compareExportTabs: document.getElementById('compare-export-tabs'),
  compareExportFilename: document.getElementById('compare-export-filename'),
  btnCompareCopyCode: document.getElementById('btn-compare-copy-code'),
  btnCompareDownloadCode: document.getElementById('btn-compare-download-code'),
  compareCodeOutputText: document.getElementById('compare-code-output-text'),
};

// --- INIZIALIZZAZIONE ---
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
});

// --- GESTIONE EVENTI ---
function setupEventListeners() {
  // Cambio modalità input
  elements.btnModeFile.addEventListener('click', () => toggleInputMode('file'));
  elements.btnModeText.addEventListener('click', () => toggleInputMode('text'));
  
  // File drag & drop
  elements.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropZone.classList.add('dragover');
  });
  
  elements.dropZone.addEventListener('dragleave', () => {
    elements.dropZone.classList.remove('dragover');
  });
  
  elements.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropZone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleSelectedFile(files[0]);
    }
  });
  
  elements.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleSelectedFile(e.target.files[0]);
    }
  });
  
  // Azioni principali
  elements.btnProcess.addEventListener('click', processBookmarksData);
  elements.btnLoadExample.addEventListener('click', loadExampleFile);
  
  // Filtro ricerca tabella
  elements.tableSearch.addEventListener('input', (e) => {
    appState.searchQuery = e.target.value;
    appState.currentPage = 1;
    applyFiltersAndRenderTable();
  });
  
  // Ordinamento tabella
  elements.tableHeaders.forEach(header => {
    if (header.hasAttribute('data-sort')) {
      header.addEventListener('click', () => {
        const col = header.getAttribute('data-sort');
        if (appState.sortColumn === col) {
          appState.sortDirection = appState.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
          appState.sortColumn = col;
          appState.sortDirection = 'asc';
        }
        
        // Aggiorna indicatori visuali intestazioni
        elements.tableHeaders.forEach(th => {
          const ind = th.querySelector('.sort-indicator');
          if (ind) ind.className = 'sort-indicator';
        });
        
        const indicator = header.querySelector('.sort-indicator');
        if (indicator) {
          indicator.classList.add(appState.sortDirection);
        }
        
        applyFiltersAndRenderTable();
      });
    }
  });
  
  // Controlli impaginazione
  elements.btnPagePrev.addEventListener('click', () => {
    if (appState.currentPage > 1) {
      appState.currentPage--;
      renderTable();
    }
  });
  
  elements.btnPageNext.addEventListener('click', () => {
    const totalPages = Math.ceil(appState.filteredBookmarks.length / appState.itemsPerPage);
    if (appState.currentPage < totalPages) {
      appState.currentPage++;
      renderTable();
    }
  });
  
  // Tab di esportazione
  elements.exportTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      elements.exportTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      appState.currentExportFormat = tab.getAttribute('data-format');
      updateExportOutput();
    });
  });
  
  // Opzioni immediate
  elements.optExcludeIcons.addEventListener('change', (e) => {
    appState.excludeIcons = e.target.checked;
    if (appState.parsedTree.length > 0) {
      updateExportOutput();
    }
  });
  
  elements.optDateFormat.addEventListener('change', (e) => {
    appState.dateFormat = e.target.value;
    if (appState.parsedTree.length > 0) {
      // Dobbiamo ri-processare le date per l'esportazione e per la tabella
      processBookmarksData(false); 
    }
  });
  
  // Copia e download codice
  elements.btnCopyCode.addEventListener('click', copyCodeToClipboard);
  elements.btnDownloadCode.addEventListener('click', downloadCodeFile);

  // Toggle "esporta solo cartella corrente"
  elements.optExportOnlyFolder.addEventListener('change', (e) => {
    appState.exportOnlyFolder = e.target.checked;
    updateExportOutput();
  });

  // Eventi per i controlli dell'albero
  elements.treeSearchInput.addEventListener('input', (e) => {
    appState.treeSearchQuery = e.target.value;
    renderFolderTree();
  });

  elements.btnTreeExpandAll.addEventListener('click', () => {
    toggleAllTreeFolders(true);
  });

  elements.btnTreeCollapseAll.addEventListener('click', () => {
    toggleAllTreeFolders(false);
  });

  elements.optTreeShowLinks.addEventListener('change', (e) => {
    appState.showLinksInTree = e.target.checked;
    renderFolderTree();
  });

  // --- EVENT LISTENERS CONFRONTO ---
  
  // Cambio modalità principale dell'applicazione (Convertitore vs Confrontatore)
  elements.modeConvertTab.addEventListener('click', () => switchAppMode('convert'));
  elements.modeCompareTab.addEventListener('click', () => switchAppMode('compare'));

  // Cambio modalità input File A
  elements.btnCompareModeFileA.addEventListener('click', () => toggleCompareInputMode('A', 'file'));
  elements.btnCompareModeTextA.addEventListener('click', () => toggleCompareInputMode('A', 'text'));
  
  // Cambio modalità input File B
  elements.btnCompareModeFileB.addEventListener('click', () => toggleCompareInputMode('B', 'file'));
  elements.btnCompareModeTextB.addEventListener('click', () => toggleCompareInputMode('B', 'text'));

  // Drag & drop File A
  elements.dropZoneA.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropZoneA.classList.add('dragover');
  });
  elements.dropZoneA.addEventListener('dragleave', () => {
    elements.dropZoneA.classList.remove('dragover');
  });
  elements.dropZoneA.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropZoneA.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleSelectedCompareFile('A', files[0]);
    }
  });
  elements.fileInputA.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleSelectedCompareFile('A', e.target.files[0]);
    }
  });

  // Drag & drop File B
  elements.dropZoneB.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropZoneB.classList.add('dragover');
  });
  elements.dropZoneB.addEventListener('dragleave', () => {
    elements.dropZoneB.classList.remove('dragover');
  });
  elements.dropZoneB.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropZoneB.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleSelectedCompareFile('B', files[0]);
    }
  });
  elements.fileInputB.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleSelectedCompareFile('B', e.target.files[0]);
    }
  });

  // Opzioni immediate confronto
  elements.optCompareExcludeIcons.addEventListener('change', (e) => {
    appState.compareExcludeIcons = e.target.checked;
    if (appState.comparisonResults) {
      updateCompareExportOutput();
    }
  });
  
  elements.optCompareDateFormat.addEventListener('change', (e) => {
    appState.compareDateFormat = e.target.value;
    if (appState.comparisonResults) {
      processCompareData(false);
    }
  });

  // Azioni confronto
  elements.btnCompare.addEventListener('click', () => processCompareData());
  elements.btnLoadCompareExample.addEventListener('click', loadCompareExampleFiles);

  // Ricerca in tabella di confronto
  elements.compareTableSearch.addEventListener('input', (e) => {
    appState.compareSearchQuery = e.target.value;
    appState.compareCurrentPage = 1;
    applyCompareFiltersAndRenderTable();
  });

  // Filtro schede stato
  const compareFilterBtns = elements.compareFilterTabs.querySelectorAll('.btn-tab');
  compareFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      compareFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.compareCurrentFilter = btn.getAttribute('data-filter');
      appState.compareCurrentPage = 1;
      applyCompareFiltersAndRenderTable();
    });
  });

  // Paginazione confronto
  elements.btnComparePagePrev.addEventListener('click', () => {
    if (appState.compareCurrentPage > 1) {
      appState.compareCurrentPage--;
      renderCompareTable();
    }
  });
  elements.btnComparePageNext.addEventListener('click', () => {
    const totalPages = Math.ceil(appState.filteredCompareList.length / appState.compareItemsPerPage);
    if (appState.compareCurrentPage < totalPages) {
      appState.compareCurrentPage++;
      renderCompareTable();
    }
  });

  // Tab di esportazione report confronto
  const compareExportTabsEl = elements.compareExportTabs.querySelectorAll('.btn-tab');
  compareExportTabsEl.forEach(tab => {
    tab.addEventListener('click', () => {
      compareExportTabsEl.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      appState.compareExportFormat = tab.getAttribute('data-format');
      updateCompareExportOutput();
    });
  });

  // Copia e download codice report
  elements.btnCompareCopyCode.addEventListener('click', copyCompareReportToClipboard);
  elements.btnCompareDownloadCode.addEventListener('click', downloadCompareReportFile);
}

// --- LOGICA DI CONTROLLO INTERFACCIA ---
function toggleInputMode(mode) {
  if (mode === 'file') {
    elements.btnModeFile.classList.add('active');
    elements.btnModeText.classList.remove('active');
    elements.dropZone.classList.remove('hidden');
    elements.pasteContainer.classList.add('hidden');
  } else {
    elements.btnModeFile.classList.remove('active');
    elements.btnModeText.classList.add('active');
    elements.dropZone.classList.add('hidden');
    elements.pasteContainer.classList.remove('hidden');
  }
}

function handleSelectedFile(file) {
  elements.selectedFileInfo.textContent = `Selezionato: ${file.name} (${formatBytes(file.size)})`;
  const reader = new FileReader();
  reader.onload = (e) => {
    appState.originalHtml = e.target.result;
    showToast('File caricato con successo!');
  };
  reader.readAsText(file);
}

async function loadExampleFile() {
  showLoader('Download file di esempio...');
  try {
    const response = await fetch('./esempi/compare_example_new.html');
    if (!response.ok) throw new Error('Impossibile scaricare il file di esempio.');
    const text = await response.text();
    
    appState.originalHtml = text;
    elements.selectedFileInfo.textContent = `Caricato file esempio`;
    
    // Passa in modalità file e processa
    toggleInputMode('file');
    hideLoader();
    processBookmarksData();
  } catch (error) {
    hideLoader();
    showToast('Errore nel caricamento dell\'esempio: ' + error.message);
  }
}

function showLoader(message = 'Elaborazione in corso...') {
  elements.loaderMessage.textContent = message;
  elements.appLoader.classList.remove('hidden');
}

function hideLoader() {
  elements.appLoader.classList.add('hidden');
}

// --- ELABORAZIONE DATI ---
function processBookmarksData(shouldScroll = true) {
  let htmlContent = '';
  if (elements.btnModeText.classList.contains('active')) {
    htmlContent = elements.textPaste.value.trim();
    appState.originalHtml = htmlContent;
  } else {
    htmlContent = appState.originalHtml;
  }
  
  if (!htmlContent) {
    showToast('Nessun contenuto da elaborare! Carica un file o incolla il codice.');
    return;
  }
  
  showLoader('Analisi dei preferiti HTML in corso...');
  
  // Utilizziamo setTimeout per permettere all'interfaccia di renderizzare il loader
  setTimeout(() => {
    try {
      // 1. Parsing ad albero
      const rawTree = parseBookmarks(htmlContent);
      if (!rawTree || rawTree.length === 0) {
        throw new Error('Nessun preferito estratto. Assicurati che sia un file di preferiti HTML valido.');
      }
      
      // 2. Applicazione formattazione date desiderata sul file originale
      appState.parsedTree = formatTreeDates(rawTree, appState.dateFormat);
      
      // Inizializza gli stati di espansione e calcola i conteggi dei preferiti per cartella
      initTreeNodesState(appState.parsedTree);
      computeFolderCounts(appState.parsedTree);
      
      appState.flatBookmarks = flattenBookmarks(appState.parsedTree);
      
      // 3. Calcolo e aggiornamento statistiche
      updateStats();
      
      // 4. Rendering albero sidebar
      renderFolderTree();
      
      // 5. Filtri e rendering tabella
      appState.currentPage = 1;
      appState.activeFolderFilter = null; // Resetta filtro cartella
      applyFiltersAndRenderTable();
      
      // 6. Generazione file esportazione
      updateExportOutput();
      
      // Mostra pannello risultati
      elements.resultsContainer.classList.remove('hidden');
      hideLoader();
      showToast('Preferiti convertiti con successo!');
      
      if (shouldScroll) {
        elements.resultsContainer.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      hideLoader();
      showToast('Errore di elaborazione: ' + error.message);
      console.error(error);
    }
  }, 100);
}

// --- STATISTICHE ED ESTRAZIONI ---
function updateStats() {
  const totalBookmarks = appState.flatBookmarks.length;
  const totalFolders = countFolders(appState.parsedTree);
  const maxDepth = getMaxDepth(appState.parsedTree);
  
  // Estrazione domini
  const domainCounts = {};
  appState.flatBookmarks.forEach(b => {
    const domain = getDomainName(b.url);
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
  });
  
  const uniqueDomainsCount = Object.keys(domainCounts).length;
  
  // Aggiorna widget numerici
  animateCount(elements.statBookmarks, totalBookmarks);
  animateCount(elements.statFolders, totalFolders);
  animateCount(elements.statDepth, maxDepth);
  animateCount(elements.statDomains, uniqueDomainsCount);
  
  // Aggiorna grafico domini principali
  renderTopDomains(domainCounts);
}

function countFolders(nodes) {
  let count = 0;
  nodes.forEach(node => {
    if (node.type === 'folder') {
      count += 1 + countFolders(node.children);
    }
  });
  return count;
}

function getMaxDepth(nodes) {
  if (!nodes || nodes.length === 0) return 0;
  let max = 0;
  nodes.forEach(node => {
    if (node.type === 'folder') {
      const depth = 1 + getMaxDepth(node.children);
      if (depth > max) max = depth;
    }
  });
  return max;
}

function getDomainName(urlStr) {
  try {
    if (urlStr.startsWith('chrome://') || urlStr.startsWith('about:') || urlStr.startsWith('file:')) {
      return urlStr.split('/')[0] || urlStr;
    }
    const url = new URL(urlStr);
    return url.hostname.replace('www.', '');
  } catch (e) {
    const match = urlStr.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n?]+)/im);
    return match ? match[1] : 'Altro';
  }
}

function renderTopDomains(domainCounts) {
  elements.domainListView.innerHTML = '';
  
  // Ordina i domini per frequenza decrescente
  const sortedDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // Prendi i primi 5
    
  if (sortedDomains.length === 0) {
    elements.domainListView.innerHTML = '<p class="card-desc">Nessun dominio estratto</p>';
    return;
  }
  
  const maxCount = sortedDomains[0][1];
  
  sortedDomains.forEach(([domain, count]) => {
    const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
    
    const domainItem = document.createElement('div');
    domainItem.className = 'domain-item';
    domainItem.innerHTML = `
      <div class="domain-info-flex">
        <span class="domain-name" title="${domain}">${domain}</span>
        <span class="domain-count">${count} link</span>
      </div>
      <div class="domain-bar-bg">
        <div class="domain-bar-fill" style="width: 0%"></div>
      </div>
    `;
    
    elements.domainListView.appendChild(domainItem);
    
    // Animazione progressiva della barra di caricamento
    setTimeout(() => {
      const bar = domainItem.querySelector('.domain-bar-fill');
      if (bar) bar.style.width = `${percentage}%`;
    }, 100);
  });
}

// --- ALBERO DELLA CARTELLA SIDEBAR ---
function initTreeNodesState(nodes) {
  if (!nodes || !Array.isArray(nodes)) return;
  nodes.forEach(node => {
    if (node.type === 'folder') {
      node.expanded = false;
      initTreeNodesState(node.children);
    }
  });
}

function computeFolderCounts(nodes) {
  if (!nodes || !Array.isArray(nodes)) return;
  nodes.forEach(node => {
    if (node.type === 'folder') {
      computeFolderCounts(node.children);
      const children = node.children || [];
      node.directBookmarkCount = children.filter(c => c.type === 'bookmark').length;
      const subfoldersTotal = children
        .filter(c => c.type === 'folder')
        .reduce((sum, f) => sum + (f.totalBookmarkCount || 0), 0);
      node.totalBookmarkCount = node.directBookmarkCount + subfoldersTotal;
    }
  });
}

function evaluateTreeSearch(nodes, query) {
  if (!nodes || !Array.isArray(nodes)) return false;
  if (!query) {
    nodes.forEach(node => {
      node.isMatched = false;
      node.hasMatchedDescendant = false;
      if (node.type === 'folder' && node.children) {
        evaluateTreeSearch(node.children, query);
      }
    });
    return false;
  }

  const q = query.toLowerCase();
  let anyMatch = false;

  nodes.forEach(node => {
    if (node.type === 'folder') {
      const isMatched = node.title && node.title.toLowerCase().includes(q);
      const hasMatchedDescendant = evaluateTreeSearch(node.children, query);
      
      node.isMatched = isMatched;
      node.hasMatchedDescendant = hasMatchedDescendant;
      
      if (isMatched || hasMatchedDescendant) {
        anyMatch = true;
      }
    } else if (node.type === 'bookmark') {
      const isMatched = (node.title && node.title.toLowerCase().includes(q)) || 
                        (node.url && node.url.toLowerCase().includes(q));
      node.isMatched = isMatched;
      if (isMatched) {
        anyMatch = true;
      }
    }
  });

  return anyMatch;
}

function toggleAllTreeFolders(expanded) {
  function recurse(nodes) {
    if (!nodes || !Array.isArray(nodes)) return;
    nodes.forEach(node => {
      if (node.type === 'folder') {
        node.expanded = expanded;
        recurse(node.children);
      }
    });
  }
  recurse(appState.parsedTree);
  renderFolderTree();
}

function getFolderIconSvg(expanded) {
  if (expanded) {
    return `<svg class="tree-folder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z"></path>
      <path d="M2 10h20"></path>
    </svg>`;
  } else {
    return `<svg class="tree-folder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    </svg>`;
  }
}

function isFolderActive(folderPath) {
  if (!appState.activeFolderFilter) return false;
  if (appState.activeFolderFilter.length !== folderPath.length) return false;
  return folderPath.every((val, index) => val === appState.activeFolderFilter[index]);
}

function renderFolderTree() {
  elements.treeRootView.innerHTML = '';
  
  // Applica la valutazione della ricerca nell'albero
  evaluateTreeSearch(appState.parsedTree, appState.treeSearchQuery);
  
  // Nodo Radice
  const rootHeader = document.createElement('div');
  rootHeader.className = 'tree-node-header';
  if (!appState.activeFolderFilter) {
    rootHeader.classList.add('active');
  }
  rootHeader.id = 'tree-root-header';
  
  const totalCount = appState.flatBookmarks.length;
  rootHeader.innerHTML = `
    <svg class="tree-folder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
    </svg>
    <span>Tutte le cartelle</span>
    <span class="tree-badge" title="Totale preferiti">${totalCount}</span>
  `;
  
  rootHeader.addEventListener('click', () => {
    const actives = elements.treeRootView.querySelectorAll('.tree-node-header');
    actives.forEach(a => a.classList.remove('active'));
    rootHeader.classList.add('active');
    
    appState.activeFolderFilter = null;
    appState.currentPage = 1;
    applyFiltersAndRenderTable();
    updateExportScopeBanner();
  });
  
  elements.treeRootView.appendChild(rootHeader);
  
  const container = document.createElement('div');
  container.className = 'tree-node-children';
  
  // Costruisci ricorsivamente l'albero delle cartelle
  buildTreeHTML(appState.parsedTree, container, []);
  
  elements.treeRootView.appendChild(container);
}

function buildTreeHTML(nodes, parentEl, currentPath = []) {
  const query = appState.treeSearchQuery;
  
  nodes.forEach(node => {
    if (node.type === 'folder') {
      if (query && !node.isMatched && !node.hasMatchedDescendant) {
        return;
      }
      
      const folderPath = [...currentPath, node.title];
      
      const nodeEl = document.createElement('div');
      nodeEl.className = 'tree-node';
      
      const headerEl = document.createElement('div');
      headerEl.className = 'tree-node-header';
      
      const isActive = isFolderActive(folderPath);
      if (isActive) {
        headerEl.classList.add('active');
      }
      
      if (query && node.isMatched) {
        headerEl.classList.add('highlighted');
      }
      
      const hasChildrenFolders = node.children.some(c => c.type === 'folder');
      const hasChildrenLinks = node.children.some(c => c.type === 'bookmark');
      const hasAnyChildren = hasChildrenFolders || (appState.showLinksInTree && hasChildrenLinks);
      
      const isExpanded = query ? (node.hasMatchedDescendant || node.expanded) : node.expanded;
      const folderIconSvg = getFolderIconSvg(isExpanded);
      const badgeHtml = `<span class="tree-badge" title="Diretti: ${node.directBookmarkCount} / Totali: ${node.totalBookmarkCount}">${node.totalBookmarkCount}</span>`;
      
      headerEl.innerHTML = `
        <svg class="tree-toggle-icon ${isExpanded ? 'expanded' : ''}" style="opacity: ${hasAnyChildren ? 1 : 0}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        ${folderIconSvg}
        <span class="folder-title" title="${escapeHTML(node.title)}">${escapeHTML(node.title)}</span>
        ${badgeHtml}
      `;
      
      nodeEl.appendChild(headerEl);
      
      const childrenContainer = document.createElement('div');
      childrenContainer.className = 'tree-node-children';
      childrenContainer.style.display = isExpanded ? 'block' : 'none';
      
      if (isExpanded) {
        buildTreeHTML(node.children, childrenContainer, folderPath);
        nodeEl.dataset.rendered = 'true';
      }
      
      nodeEl.appendChild(childrenContainer);
      
      const toggleIcon = headerEl.querySelector('.tree-toggle-icon');
      if (toggleIcon) {
        toggleIcon.addEventListener('click', (e) => {
          e.stopPropagation();
          node.expanded = !node.expanded;
          const nowExpanded = query ? (node.hasMatchedDescendant || node.expanded) : node.expanded;
          
          childrenContainer.style.display = nowExpanded ? 'block' : 'none';
          toggleIcon.classList.toggle('expanded', nowExpanded);
          
          const iconContainer = headerEl.querySelector('.tree-folder-icon');
          if (iconContainer) {
            iconContainer.outerHTML = getFolderIconSvg(nowExpanded);
          }
          
          if (nowExpanded && !nodeEl.dataset.rendered) {
            buildTreeHTML(node.children, childrenContainer, folderPath);
            nodeEl.dataset.rendered = 'true';
          }
        });
      }
      
      headerEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        if (toggleIcon && hasAnyChildren) {
          toggleIcon.click();
        }
      });
      
      headerEl.addEventListener('click', () => {
        const actives = elements.treeRootView.querySelectorAll('.tree-node-header');
        actives.forEach(a => a.classList.remove('active'));
        headerEl.classList.add('active');
        
        appState.activeFolderFilter = folderPath;
        appState.currentPage = 1;
        applyFiltersAndRenderTable();
        updateExportScopeBanner();
      });
      
      parentEl.appendChild(nodeEl);
      
    } else if (node.type === 'bookmark' && appState.showLinksInTree) {
      if (query && !node.isMatched) {
        return;
      }
      
      const linkEl = document.createElement('a');
      linkEl.href = node.url;
      linkEl.target = '_blank';
      linkEl.rel = 'noopener noreferrer';
      linkEl.className = 'tree-bookmark-node';
      if (query && node.isMatched) {
        linkEl.classList.add('highlighted');
      }
      
      let faviconHtml = '';
      if (node.icon) {
        faviconHtml = `<img class="bookmark-favicon" src="${node.icon}" alt="" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 24 24%22 stroke=%22currentColor%22 stroke-width=%222%22><path d=%22M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71%22/></svg>'">`;
      } else {
        faviconHtml = `<svg class="bookmark-favicon text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="padding: 2px;">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </svg>`;
      }
      
      linkEl.innerHTML = `
        ${faviconHtml}
        <span class="bookmark-title" title="${escapeHTML(node.title)}">${escapeHTML(node.title)}</span>
      `;
      
      parentEl.appendChild(linkEl);
    }
  });
}

// --- FILTRO E GESTIONE TABELLA (MATRICE) ---
function applyFiltersAndRenderTable() {
  let result = [...appState.flatBookmarks];
  
  // 1. Filtro cartella attiva
  if (appState.activeFolderFilter) {
    const filterPathLen = appState.activeFolderFilter.length;
    result = result.filter(b => {
      // Controlla se il percorso della cartella del bookmark inizia con il filtro selezionato
      if (b.folderPath.length < filterPathLen) return false;
      for (let i = 0; i < filterPathLen; i++) {
        if (b.folderPath[i] !== appState.activeFolderFilter[i]) return false;
      }
      return true;
    });
  }
  
  // 2. Filtro ricerca testuale
  if (appState.searchQuery) {
    const q = appState.searchQuery.toLowerCase();
    result = result.filter(b => 
      b.title.toLowerCase().includes(q) || 
      b.url.toLowerCase().includes(q) || 
      b.folderPath.join(' / ').toLowerCase().includes(q)
    );
  }
  
  // 3. Ordinamento
  const col = appState.sortColumn;
  const dir = appState.sortDirection === 'asc' ? 1 : -1;
  
  result.sort((a, b) => {
    let valA = '';
    let valB = '';
    
    if (col === 'title') {
      valA = a.title.toLowerCase();
      valB = b.title.toLowerCase();
    } else if (col === 'url') {
      valA = a.url.toLowerCase();
      valB = b.url.toLowerCase();
    } else if (col === 'folder') {
      valA = a.folderPath.join(' / ').toLowerCase();
      valB = b.folderPath.join(' / ').toLowerCase();
    } else if (col === 'date') {
      valA = a.addDate || '';
      valB = b.addDate || '';
    } else {
      // Default: indice originario implicitamente mantenuto nell'array flat
      return 0; 
    }
    
    if (valA < valB) return -1 * dir;
    if (valA > valB) return 1 * dir;
    return 0;
  });
  
  appState.filteredBookmarks = result;
  renderTable();
}

function renderTable() {
  elements.tableBody.innerHTML = '';
  
  const total = appState.filteredBookmarks.length;
  elements.tableTotalCount.textContent = total;
  
  if (total === 0) {
    elements.tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
          Nessun preferito trovato corrispondente ai criteri impostati.
        </td>
      </tr>
    `;
    elements.tableRangeStart.textContent = 0;
    elements.tableRangeEnd.textContent = 0;
    renderPagination(0);
    return;
  }
  
  // Calcolo intervallo
  const startIdx = (appState.currentPage - 1) * appState.itemsPerPage;
  const endIdx = Math.min(startIdx + appState.itemsPerPage, total);
  
  elements.tableRangeStart.textContent = startIdx + 1;
  elements.tableRangeEnd.textContent = endIdx;
  
  const pageData = appState.filteredBookmarks.slice(startIdx, endIdx);
  
  pageData.forEach((bookmark, i) => {
    const globalIdx = startIdx + i + 1;
    const folderSpan = bookmark.folderPath.length > 0 
      ? `<span class="folder-tag" title="${bookmark.folderPath.join(' / ')}">${bookmark.folderPath[bookmark.folderPath.length - 1]}</span>`
      : `<span class="text-muted">—</span>`;
      
    // Costruzione Favicon
    let faviconHtml = '';
    if (bookmark.icon) {
      faviconHtml = `<img class="bookmark-favicon" src="${bookmark.icon}" alt="" onerror="this.style.display='none'">`;
    } else {
      faviconHtml = `<svg class="bookmark-favicon text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="padding: 2px;">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
      </svg>`;
    }
    
    // Formattazione data visualizzata
    let displayDate = '—';
    if (bookmark.addDate) {
      if (appState.dateFormat === 'locale') {
        const d = new Date(bookmark.addDate);
        displayDate = isNaN(d) ? bookmark.addDate : d.toLocaleString('it-IT');
      } else {
        displayDate = bookmark.addDate;
      }
    }
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-idx" style="text-align: center; color: var(--text-muted);">${globalIdx}</td>
      <td class="col-folder">${folderSpan}</td>
      <td class="col-title" title="${bookmark.title}">
        ${faviconHtml}
        <span>${escapeHTML(bookmark.title)}</span>
      </td>
      <td class="col-url" title="${bookmark.url}">
        <a href="${bookmark.url}" target="_blank" rel="noopener noreferrer">${escapeHTML(bookmark.url)}</a>
      </td>
      <td class="col-date" style="color: var(--text-secondary); font-size: 0.8rem;">${displayDate}</td>
    `;
    elements.tableBody.appendChild(tr);
  });
  
  renderPagination(total);
}

function renderPagination(totalItems) {
  elements.pageNumbers.innerHTML = '';
  const totalPages = Math.ceil(totalItems / appState.itemsPerPage);
  
  // Abilita / disabilita pulsanti principali
  elements.btnPagePrev.disabled = appState.currentPage === 1;
  elements.btnPageNext.disabled = appState.currentPage === totalPages || totalPages === 0;
  
  if (totalPages <= 1) return;
  
  const maxButtons = 5;
  let startPage = Math.max(1, appState.currentPage - 2);
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);
  
  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }
  
  // Primo pulsante se non visibile
  if (startPage > 1) {
    addPageButton(1);
    if (startPage > 2) {
      const dots = document.createElement('span');
      dots.className = 'page-num dots';
      dots.textContent = '...';
      elements.pageNumbers.appendChild(dots);
    }
  }
  
  // Intervallo di pagine
  for (let p = startPage; p <= endPage; p++) {
    addPageButton(p);
  }
  
  // Ultimo pulsante se non visibile
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const dots = document.createElement('span');
      dots.className = 'page-num dots';
      dots.textContent = '...';
      elements.pageNumbers.appendChild(dots);
    }
    addPageButton(totalPages);
  }
}

function addPageButton(pageNumber) {
  const btn = document.createElement('button');
  btn.className = `page-num ${appState.currentPage === pageNumber ? 'active' : ''}`;
  btn.textContent = pageNumber;
  btn.addEventListener('click', () => {
    appState.currentPage = pageNumber;
    renderTable();
  });
  elements.pageNumbers.appendChild(btn);
}

// --- GENERATORE DI FORMATI DI ESPORTAZIONE ---
function updateExportOutput() {
  const format = appState.currentExportFormat;
  let content = '';
  let filename = 'bookmarks.json';

  // Determina la sorgente dati: tutti i preferiti oppure solo quelli della cartella selezionata
  const useFilter = appState.exportOnlyFolder && appState.activeFolderFilter;
  const sourceFlat = useFilter
    ? appState.flatBookmarks.filter(b => {
        const fp = appState.activeFolderFilter;
        if (b.folderPath.length < fp.length) return false;
        return fp.every((seg, i) => b.folderPath[i] === seg);
      })
    : appState.flatBookmarks;
  const sourceTree = useFilter
    ? extractSubtree(appState.parsedTree, appState.activeFolderFilter)
    : appState.parsedTree;

  const folderSlug = useFilter
    ? appState.activeFolderFilter[appState.activeFolderFilter.length - 1]
        .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
    : null;

  // Applica filtro icone in base alle opzioni dello stato
  const cleanTree = cleanDataForExport(sourceTree, appState.excludeIcons);
  const cleanFlat = cleanDataForExport(sourceFlat, appState.excludeIcons);

  switch (format) {
    case 'json-flat':
      content = JSON.stringify(cleanFlat, null, 2);
      filename = folderSlug ? `${folderSlug}_flat.json` : 'bookmarks_flat.json';
      break;

    case 'json-tree':
      content = JSON.stringify(cleanTree, null, 2);
      filename = folderSlug ? `${folderSlug}_tree.json` : 'bookmarks_tree.json';
      break;

    case 'csv':
      content = generateCSV(cleanFlat);
      filename = folderSlug ? `${folderSlug}.csv` : 'bookmarks.csv';
      break;

    case 'markdown':
      content = generateMarkdown(cleanTree);
      filename = folderSlug ? `${folderSlug}.md` : 'bookmarks.md';
      break;

    case 'sql':
      content = generateSQL(cleanFlat);
      filename = folderSlug ? `${folderSlug}.sql` : 'bookmarks.sql';
      break;
  }

  elements.exportFilename.textContent = filename;
  elements.codeOutputText.value = content;
}

/**
 * Aggiorna il banner dell'ambito di esportazione in base alla cartella attiva.
 */
function updateExportScopeBanner() {
  const banner = elements.exportScopeBanner;
  const nameEl = elements.exportScopeFolderName;
  const toggle = elements.optExportOnlyFolder;

  if (appState.activeFolderFilter && appState.activeFolderFilter.length > 0) {
    const folderName = appState.activeFolderFilter[appState.activeFolderFilter.length - 1];
    nameEl.textContent = folderName;
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
    // Resetta il toggle quando si torna alla radice
    appState.exportOnlyFolder = false;
    toggle.checked = false;
  }
  updateExportOutput();
}

/**
 * Estrae il sotto-albero corrispondente al percorso folderPath dall'albero completo.
 * Ritorna i figli della cartella trovata (come array di nodi) oppure [] se non trovata.
 */
function extractSubtree(nodes, folderPath, depth = 0) {
  if (!nodes || folderPath.length === 0) return nodes || [];
  for (const node of nodes) {
    if (node.type === 'folder' && node.title === folderPath[depth]) {
      if (depth === folderPath.length - 1) {
        // Trovata la cartella target: restituisce i suoi figli
        return node.children || [];
      }
      return extractSubtree(node.children, folderPath, depth + 1);
    }
  }
  return [];
}

function cleanDataForExport(data, excludeIcons) {
  // Funzione ricorsiva per ripulire le icone ed evadere modifiche in-place
  if (Array.isArray(data)) {
    return data.map(item => cleanDataForExport(item, excludeIcons));
  } else if (typeof data === 'object' && data !== null) {
    const cleaned = { ...data };
    if (excludeIcons && 'icon' in cleaned) {
      delete cleaned.icon;
    }
    if ('children' in cleaned && Array.isArray(cleaned.children)) {
      cleaned.children = cleanDataForExport(cleaned.children, excludeIcons);
    }
    return cleaned;
  }
  return data;
}

function generateCSV(flatData) {
  const headers = ['Indice', 'Cartella', 'Titolo', 'URL Link', 'Data Aggiunta'];
  const rows = flatData.map((b, i) => {
    return [
      (i + 1).toString(),
      b.folderPath.join(' / '),
      b.title,
      b.url,
      b.addDate || ''
    ];
  });
  
  const escapeCSV = (val) => {
    const str = val.replace(/"/g, '""');
    return `"${str}"`;
  };
  
  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');
  
  return csvContent;
}

function generateMarkdown(treeData) {
  let md = '# I Miei Preferiti\n\n';
  
  function buildMDList(nodes, level = 1) {
    nodes.forEach(node => {
      if (node.type === 'folder') {
        const hash = '#'.repeat(Math.min(level + 1, 6));
        md += `${hash} ${node.title}\n\n`;
        buildMDList(node.children, level + 1);
      } else if (node.type === 'bookmark') {
        md += `* [${node.title || node.url}](${node.url})\n`;
      }
    });
    // Aggiunge riga vuota alla fine di ogni livello cartella
    md += '\n';
  }
  
  buildMDList(treeData, 1);
  return md.trim();
}

function generateSQL(flatData) {
  let sql = `-- Tabella creata per preferiti Bookmarks Tools\n`;
  sql += `CREATE TABLE IF NOT EXISTS preferiti (\n`;
  sql += `  id INT AUTO_INCREMENT PRIMARY KEY,\n`;
  sql += `  percorso_cartella TEXT,\n`;
  sql += `  titolo VARCHAR(512),\n`;
  sql += `  url TEXT,\n`;
  sql += `  data_aggiunta VARCHAR(50)\n`;
  sql += `);\n\n`;
  
  if (flatData.length === 0) return sql;
  
  // Dividiamo in blocchi di 500 inserimenti per evitare query gigantesche
  const chunkSize = 500;
  for (let i = 0; i < flatData.length; i += chunkSize) {
    const chunk = flatData.slice(i, i + chunkSize);
    sql += `INSERT INTO preferiti (percorso_cartella, titolo, url, data_aggiunta) VALUES\n`;
    
    const valueLines = chunk.map(b => {
      const folder = b.folderPath.join(' / ').replace(/'/g, "''");
      const title = b.title.replace(/'/g, "''");
      const url = b.url.replace(/'/g, "''");
      const date = (b.addDate || '').replace(/'/g, "''");
      return `  ('${folder}', '${title}', '${url}', '${date}')`;
    });
    
    sql += valueLines.join(',\n') + ';\n\n';
  }
  
  return sql.trim();
}

function copyCodeToClipboard() {
  const codeText = elements.codeOutputText.value;
  if (!codeText) {
    showToast('Nessun codice da copiare!');
    return;
  }
  
  navigator.clipboard.writeText(codeText)
    .then(() => {
      showToast('Codice copiato negli appunti!');
    })
    .catch(err => {
      // Fallback
      elements.codeOutputText.select();
      document.execCommand('copy');
      showToast('Codice copiato negli appunti (fallback)!');
    });
}

function downloadCodeFile() {
  const codeText = elements.codeOutputText.value;
  if (!codeText) {
    showToast('Nessun codice da scaricare!');
    return;
  }
  
  const filename = elements.exportFilename.textContent;
  let mimeType = 'text/plain';
  if (filename.endsWith('.json')) mimeType = 'application/json';
  else if (filename.endsWith('.csv')) mimeType = 'text/csv';
  else if (filename.endsWith('.md')) mimeType = 'text/markdown';
  else if (filename.endsWith('.sql')) mimeType = 'application/sql';
  
  const blob = new Blob([codeText], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
  
  showToast('Download avviato con successo!');
}

// --- UTILITÀ MINORI ---
function formatTreeDates(nodes, formatType) {
  return nodes.map(node => {
    const formattedNode = { ...node };
    if (formattedNode.type === 'bookmark') {
      formattedNode.addDate = formatSingleDate(formattedNode.addDate, formatType);
    } else if (formattedNode.type === 'folder' && formattedNode.children) {
      formattedNode.children = formatTreeDates(formattedNode.children, formatType);
    }
    return formattedNode;
  });
}

function formatSingleDate(isoDateStr, formatType) {
  if (!isoDateStr) return '';
  const date = new Date(isoDateStr);
  if (isNaN(date.getTime())) return isoDateStr;
  
  if (formatType === 'unix') {
    return Math.floor(date.getTime() / 1000).toString();
  } else if (formatType === 'locale') {
    return date.toLocaleString('it-IT');
  }
  // Default: ISO String
  return date.toISOString();
}

function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function escapeHTML(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function animateCount(element, targetValue) {
  const duration = 800; // ms
  const startTime = performance.now();
  const startValue = parseInt(element.textContent) || 0;
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Easing out quadratic
    const easeProgress = progress * (2 - progress);
    const currentValue = Math.floor(startValue + (targetValue - startValue) * easeProgress);
    
    element.textContent = currentValue.toLocaleString('it-IT');
    
    if (progress < 1) {
      requestAnimationFrame(update);
    } else {
      element.textContent = targetValue.toLocaleString('it-IT');
    }
  }
  
  requestAnimationFrame(update);
}

function showToast(message) {
  // Rimuove toast esistenti
  const oldToast = document.querySelector('.toast-msg');
  if (oldToast) oldToast.remove();
  
  const toast = document.createElement('div');
  toast.className = 'toast-msg';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  // Rimuove dopo 3 secondi
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s ease';
    setTimeout(() => toast.remove(), 500);
  }, 2500);
}

// ==========================================
// FUNZIONALITÀ DI CONFRONTO FILE (COMPARE)
// ==========================================

function switchAppMode(mode) {
  appState.currentMode = mode;
  
  if (mode === 'convert') {
    elements.modeConvertTab.classList.add('active');
    elements.modeCompareTab.classList.remove('active');
    
    elements.convertUploadContainer.classList.remove('hidden');
    elements.compareUploadContainer.classList.add('hidden');
    
    // Mostra/nasconde i risultati corretti
    if (appState.parsedTree.length > 0) {
      elements.resultsContainer.classList.remove('hidden');
    }
    elements.compareResultsContainer.classList.add('hidden');
  } else {
    elements.modeConvertTab.classList.remove('active');
    elements.modeCompareTab.classList.add('active');
    
    elements.convertUploadContainer.classList.add('hidden');
    elements.compareUploadContainer.classList.remove('hidden');
    
    // Mostra/nasconde i risultati corretti
    elements.resultsContainer.classList.add('hidden');
    if (appState.comparisonResults) {
      elements.compareResultsContainer.classList.remove('hidden');
    }
  }
}

function toggleCompareInputMode(fileKey, inputMode) {
  const btnFile = fileKey === 'A' ? elements.btnCompareModeFileA : elements.btnCompareModeFileB;
  const btnText = fileKey === 'A' ? elements.btnCompareModeTextA : elements.btnCompareModeTextB;
  const dropZone = fileKey === 'A' ? elements.dropZoneA : elements.dropZoneB;
  const pasteContainer = fileKey === 'A' ? elements.pasteContainerA : elements.pasteContainerB;
  
  if (inputMode === 'file') {
    btnFile.classList.add('active');
    btnText.classList.remove('active');
    dropZone.classList.remove('hidden');
    pasteContainer.classList.add('hidden');
  } else {
    btnFile.classList.remove('active');
    btnText.classList.add('active');
    dropZone.classList.add('hidden');
    pasteContainer.classList.remove('hidden');
  }
}

function handleSelectedCompareFile(fileKey, file) {
  const infoEl = fileKey === 'A' ? elements.selectedFileInfoA : elements.selectedFileInfoB;
  infoEl.textContent = `Selezionato: ${file.name} (${formatBytes(file.size)})`;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    if (fileKey === 'A') {
      appState.fileA.rawHtml = e.target.result;
      appState.fileA.name = file.name;
      appState.fileA.size = file.size;
    } else {
      appState.fileB.rawHtml = e.target.result;
      appState.fileB.name = file.name;
      appState.fileB.size = file.size;
    }
    showToast(`File ${fileKey} caricato con successo!`);
  };
  reader.readAsText(file);
}

async function loadCompareExampleFiles() {
  showLoader('Download dei file di esempio per il confronto...');
  try {
    const resA = await fetch('./esempi/compare_example_old.html');
    if (!resA.ok) throw new Error('Impossibile scaricare l\'esempio A.');
    const textA = await resA.text();

    const resB = await fetch('./esempi/compare_example_new.html');
    if (!resB.ok) throw new Error('Impossibile scaricare l\'esempio B.');
    const textB = await resB.text();

    // Aggiorna lo stato di File A
    appState.fileA.rawHtml = textA;
    appState.fileA.name = 'compare_example_old.html';
    appState.fileA.size = textA.length;
    elements.selectedFileInfoA.textContent = `Caricato: compare_example_old.html`;
    toggleCompareInputMode('A', 'file');

    // Aggiorna lo stato di File B
    appState.fileB.rawHtml = textB;
    appState.fileB.name = 'compare_example_new.html';
    appState.fileB.size = textB.length;
    elements.selectedFileInfoB.textContent = `Caricato: compare_example_new.html`;
    toggleCompareInputMode('B', 'file');

    hideLoader();
    processCompareData();
  } catch (error) {
    hideLoader();
    showToast('Errore nel caricamento degli esempi: ' + error.message);
  }
}

function processCompareData(shouldScroll = true) {
  // Legge dai textareas se in modalità testo
  if (elements.btnCompareModeTextA.classList.contains('active')) {
    appState.fileA.rawHtml = elements.textPasteA.value.trim();
    appState.fileA.name = 'Testo Incollato A';
  }
  if (elements.btnCompareModeTextB.classList.contains('active')) {
    appState.fileB.rawHtml = elements.textPasteB.value.trim();
    appState.fileB.name = 'Testo Incollato B';
  }

  if (!appState.fileA.rawHtml || !appState.fileB.rawHtml) {
    showToast('Carica entrambi i file (File A e File B) o incolla il codice prima di procedere!');
    return;
  }

  showLoader('Confronto dei preferiti in corso...');

  setTimeout(() => {
    try {
      // 1. Parsing di entrambi i file
      const treeA = parseBookmarks(appState.fileA.rawHtml);
      const treeB = parseBookmarks(appState.fileB.rawHtml);

      if (!treeA || treeA.length === 0) {
        throw new Error('Nessun preferito estratto dal File A. Assicurati che sia valido.');
      }
      if (!treeB || treeB.length === 0) {
        throw new Error('Nessun preferito estratto dal File B. Assicurati che sia valido.');
      }

      // Applica formattazione data
      const formattedTreeA = formatTreeDates(treeA, appState.compareDateFormat);
      const formattedTreeB = formatTreeDates(treeB, appState.compareDateFormat);

      appState.fileA.flatBookmarks = flattenBookmarks(formattedTreeA);
      appState.fileB.flatBookmarks = flattenBookmarks(formattedTreeB);

      // 2. Esegue il confronto
      const results = compareBookmarks(appState.fileA.flatBookmarks, appState.fileB.flatBookmarks);
      appState.comparisonResults = results;

      // 3. Statistiche del confronto
      animateCount(elements.statCompareAdded, results.added.length);
      animateCount(elements.statCompareRemoved, results.removed.length);
      animateCount(elements.statCompareModified, results.modified.length);
      animateCount(elements.statCompareIdentical, results.identical.length);

      // Aggiorna i conteggi visualizzati nei tab
      elements.cntAll.textContent = results.added.length + results.removed.length + results.modified.length + results.identical.length;
      elements.cntAdded.textContent = results.added.length;
      elements.cntRemoved.textContent = results.removed.length;
      elements.cntModified.textContent = results.modified.length;
      elements.cntIdentical.textContent = results.identical.length;

      // 4. Tabella
      appState.compareCurrentPage = 1;
      applyCompareFiltersAndRenderTable();

      // 5. Generazione report esportazione
      updateCompareExportOutput();

      // Mostra container risultati
      elements.compareResultsContainer.classList.remove('hidden');
      hideLoader();
      showToast('Confronto completato con successo!');

      if (shouldScroll) {
        elements.compareResultsContainer.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      hideLoader();
      showToast('Errore nel confronto: ' + error.message);
      console.error(error);
    }
  }, 100);
}

function applyCompareFiltersAndRenderTable() {
  if (!appState.comparisonResults) return;

  const results = appState.comparisonResults;
  let rawList = [];

  // 1. Unisce le liste a seconda del filtro selezionato
  const filter = appState.compareCurrentFilter;
  if (filter === 'all') {
    rawList = [...results.added, ...results.removed, ...results.modified, ...results.identical];
  } else if (filter === 'added') {
    rawList = [...results.added];
  } else if (filter === 'removed') {
    rawList = [...results.removed];
  } else if (filter === 'modified') {
    rawList = [...results.modified];
  } else if (filter === 'identical') {
    rawList = [...results.identical];
  }

  // 2. Filtro ricerca testuale
  if (appState.compareSearchQuery) {
    const q = appState.compareSearchQuery.toLowerCase();
    rawList = rawList.filter(item => {
      const urlMatch = item.url && item.url.toLowerCase().includes(q);
      
      if (item.status === 'modified') {
        const titleMatch = (item.oldTitle && item.oldTitle.toLowerCase().includes(q)) || 
                           (item.newTitle && item.newTitle.toLowerCase().includes(q));
        const folderMatch = (item.oldFolderPath && item.oldFolderPath.join(' / ').toLowerCase().includes(q)) ||
                            (item.newFolderPath && item.newFolderPath.join(' / ').toLowerCase().includes(q));
        return urlMatch || titleMatch || folderMatch;
      } else {
        const titleMatch = item.title && item.title.toLowerCase().includes(q);
        const folderMatch = item.folderPath && item.folderPath.join(' / ').toLowerCase().includes(q);
        return urlMatch || titleMatch || folderMatch;
      }
    });
  }

  appState.filteredCompareList = rawList;
  renderCompareTable();
}

function renderCompareTable() {
  elements.compareTableBody.innerHTML = '';
  
  const total = appState.filteredCompareList.length;
  elements.compareTotalCount.textContent = total;
  
  if (total === 0) {
    elements.compareTableBody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 2rem;">
          Nessuna modifica trovata per i criteri selezionati.
        </td>
      </tr>
    `;
    elements.compareRangeStart.textContent = 0;
    elements.compareRangeEnd.textContent = 0;
    renderComparePagination(0);
    return;
  }

  const startIdx = (appState.compareCurrentPage - 1) * appState.compareItemsPerPage;
  const endIdx = Math.min(startIdx + appState.compareItemsPerPage, total);

  elements.compareRangeStart.textContent = startIdx + 1;
  elements.compareRangeEnd.textContent = endIdx;

  const pageData = appState.filteredCompareList.slice(startIdx, endIdx);

  pageData.forEach((item, i) => {
    const globalIdx = startIdx + i + 1;
    
    // Badge Stato
    let badgeHtml = '';
    if (item.status === 'added') {
      badgeHtml = `<span class="badge-status badge-added">Aggiunto</span>`;
    } else if (item.status === 'removed') {
      badgeHtml = `<span class="badge-status badge-removed">Rimosso</span>`;
    } else if (item.status === 'modified') {
      badgeHtml = `<span class="badge-status badge-modified">Modificato</span>`;
    } else {
      badgeHtml = `<span class="badge-status badge-identical">Identico</span>`;
    }

    // Cartella
    let folderHtml = '';
    if (item.status === 'added') {
      folderHtml = item.folderPath.length > 0 
        ? `<span class="folder-tag" title="${item.folderPath.join(' / ')}">${item.folderPath[item.folderPath.length - 1]}</span>`
        : `<span class="text-muted">—</span>`;
    } else if (item.status === 'removed') {
      folderHtml = item.folderPath.length > 0 
        ? `<span class="folder-tag diff-old" title="${item.folderPath.join(' / ')}">${item.folderPath[item.folderPath.length - 1]}</span>`
        : `<span class="text-muted">—</span>`;
    } else if (item.status === 'modified') {
      if (item.folderChanged) {
        const oldFolder = item.oldFolderPath.length > 0 ? item.oldFolderPath[item.oldFolderPath.length - 1] : 'Radice';
        const newFolder = item.newFolderPath.length > 0 ? item.newFolderPath[item.newFolderPath.length - 1] : 'Radice';
        folderHtml = `
          <div class="diff-container">
            <span class="folder-tag diff-old" title="${item.oldFolderPath.join(' / ')}">${oldFolder}</span>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin: 0.1rem 0;">&darr; spostato in</div>
            <span class="folder-tag diff-new" title="${item.newFolderPath.join(' / ')}">${newFolder}</span>
          </div>
        `;
      } else {
        folderHtml = item.newFolderPath.length > 0 
          ? `<span class="folder-tag" title="${item.newFolderPath.join(' / ')}">${item.newFolderPath[item.newFolderPath.length - 1]}</span>`
          : `<span class="text-muted">—</span>`;
      }
    } else {
      folderHtml = item.folderPath.length > 0 
        ? `<span class="folder-tag" title="${item.folderPath.join(' / ')}">${item.folderPath[item.folderPath.length - 1]}</span>`
        : `<span class="text-muted">—</span>`;
    }

    // Titolo
    let titleHtml = '';
    let faviconHtml = '';
    if (item.icon) {
      faviconHtml = `<img class="bookmark-favicon" src="${item.icon}" alt="" onerror="this.style.display='none'">`;
    } else {
      faviconHtml = `<svg class="bookmark-favicon text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="padding: 2px;">
        <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
      </svg>`;
    }

    if (item.status === 'added') {
      titleHtml = `${faviconHtml} <span class="diff-new">${escapeHTML(item.title)}</span>`;
    } else if (item.status === 'removed') {
      titleHtml = `${faviconHtml} <span class="diff-old">${escapeHTML(item.title)}</span>`;
    } else if (item.status === 'modified') {
      if (item.titleChanged) {
        titleHtml = `
          <div class="diff-container">
            <div>${faviconHtml} <span class="diff-old">${escapeHTML(item.oldTitle)}</span></div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-left: 1.5rem;">&darr; rinominato in</div>
            <div style="margin-left: 1.5rem;"><span class="diff-new">${escapeHTML(item.newTitle)}</span></div>
          </div>
        `;
      } else {
        titleHtml = `${faviconHtml} <span>${escapeHTML(item.newTitle)}</span>`;
      }
    } else {
      titleHtml = `${faviconHtml} <span>${escapeHTML(item.title)}</span>`;
    }

    // Data Aggiunta
    let displayDate = '—';
    const dateVal = item.addDate;
    if (dateVal) {
      if (appState.compareDateFormat === 'locale') {
        const d = new Date(dateVal);
        displayDate = isNaN(d) ? dateVal : d.toLocaleString('it-IT');
      } else {
        displayDate = dateVal;
      }
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-idx" style="text-align: center; color: var(--text-muted);">${globalIdx}</td>
      <td class="col-status">${badgeHtml}</td>
      <td class="col-folder">${folderHtml}</td>
      <td class="col-title">${titleHtml}</td>
      <td class="col-url" title="${item.url}">
        <a href="${item.url}" target="_blank" rel="noopener noreferrer">${escapeHTML(item.url)}</a>
      </td>
      <td class="col-date" style="color: var(--text-secondary); font-size: 0.8rem;">${displayDate}</td>
    `;
    elements.compareTableBody.appendChild(tr);
  });

  renderComparePagination(total);
}

function renderComparePagination(totalItems) {
  elements.comparePageNumbers.innerHTML = '';
  const totalPages = Math.ceil(totalItems / appState.compareItemsPerPage);

  elements.btnComparePagePrev.disabled = appState.compareCurrentPage === 1;
  elements.btnComparePageNext.disabled = appState.compareCurrentPage === totalPages || totalPages === 0;

  if (totalPages <= 1) return;

  const maxButtons = 5;
  let startPage = Math.max(1, appState.compareCurrentPage - 2);
  let endPage = Math.min(totalPages, startPage + maxButtons - 1);

  if (endPage - startPage + 1 < maxButtons) {
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  if (startPage > 1) {
    addComparePageButton(1);
    if (startPage > 2) {
      const dots = document.createElement('span');
      dots.className = 'page-num dots';
      dots.textContent = '...';
      elements.comparePageNumbers.appendChild(dots);
    }
  }

  for (let p = startPage; p <= endPage; p++) {
    addComparePageButton(p);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const dots = document.createElement('span');
      dots.className = 'page-num dots';
      dots.textContent = '...';
      elements.comparePageNumbers.appendChild(dots);
    }
    addComparePageButton(totalPages);
  }
}

function addComparePageButton(pageNumber) {
  const btn = document.createElement('button');
  btn.className = `page-num ${appState.compareCurrentPage === pageNumber ? 'active' : ''}`;
  btn.textContent = pageNumber;
  btn.addEventListener('click', () => {
    appState.compareCurrentPage = pageNumber;
    renderCompareTable();
  });
  elements.comparePageNumbers.appendChild(btn);
}

function updateCompareExportOutput() {
  if (!appState.comparisonResults) return;

  const format = appState.compareExportFormat;
  let content = '';
  let filename = 'report_confronto.json';

  const cleanResults = {
    added: cleanDataForExport(appState.comparisonResults.added, appState.compareExcludeIcons),
    removed: cleanDataForExport(appState.comparisonResults.removed, appState.compareExcludeIcons),
    modified: cleanDataForExport(appState.comparisonResults.modified, appState.compareExcludeIcons),
    identical: cleanDataForExport(appState.comparisonResults.identical, appState.compareExcludeIcons)
  };

  switch (format) {
    case 'json':
      content = JSON.stringify(cleanResults, null, 2);
      filename = 'report_confronto.json';
      break;
    case 'csv':
      content = generateCompareCSV(cleanResults);
      filename = 'report_confronto.csv';
      break;
    case 'markdown':
      content = generateCompareMarkdown(cleanResults);
      filename = 'report_confronto.md';
      break;
  }

  elements.compareExportFilename.textContent = filename;
  elements.compareCodeOutputText.value = content;
}

function copyCompareReportToClipboard() {
  const codeText = elements.compareCodeOutputText.value;
  if (!codeText) {
    showToast('Nessun report da copiare!');
    return;
  }
  
  navigator.clipboard.writeText(codeText)
    .then(() => {
      showToast('Report copiato negli appunti!');
    })
    .catch(err => {
      elements.compareCodeOutputText.select();
      document.execCommand('copy');
      showToast('Report copiato negli appunti (fallback)!');
    });
}

function downloadCompareReportFile() {
  const codeText = elements.compareCodeOutputText.value;
  if (!codeText) {
    showToast('Nessun report da scaricare!');
    return;
  }
  
  const filename = elements.compareExportFilename.textContent;
  let mimeType = 'text/plain';
  if (filename.endsWith('.json')) mimeType = 'application/json';
  else if (filename.endsWith('.csv')) mimeType = 'text/csv';
  else if (filename.endsWith('.md')) mimeType = 'text/markdown';
  
  const blob = new Blob([codeText], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
  
  showToast('Download del report avviato!');
}
