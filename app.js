// app.js - Controller UI & workflow Bookmarks Tools
import { safeBookmarkUrl, openBookmarkUrl } from './urls.js';

import { parseBookmarks, flattenBookmarks, decompressMozLz4 } from './parser.js?v=2.1.0';
import { compareBookmarks, generateCompareCSV, generateCompareMarkdown } from './comparator.js?v=2.1.0';
import { renderVisualGraph, resetZoom as graphResetZoom } from './visualization.js?v=2.1.0';

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
  
  // Vista Grafica
  currentView: 'table', // table or graph
  graphType: 'force', // force or sunburst
  graphShowLinks: true,
  
  // Esportazioni convertitore
  currentExportFormat: 'json-flat',
  excludeIcons: true,
  dateFormat: 'iso', // iso, unix, locale
  exportOnlyFolder: false, // esporta solo cartella visualizzata
  cleanUrls: false,

  // Stato Albero
  showLinksInTree: false,
  treeSearchQuery: '',

  // Modalità Confrontatore
  fileA: { name: '', size: 0, rawHtml: '', parsedTree: [], flatBookmarks: [] },
  fileB: { name: '', size: 0, rawHtml: '', parsedTree: [], flatBookmarks: [] },
  compareExcludeIcons: true,
  compareDateFormat: 'iso',
  compareCleanUrls: false,
  comparisonResults: null,
  filteredCompareList: [],
  compareCurrentFilter: 'all', // all, added, removed, modified, identical
  compareCurrentPage: 1,
  compareItemsPerPage: 15,
  compareSearchQuery: '',
  compareExportFormat: 'json', // json, csv, markdown

  // La Macchina del Tempo (Timeline Nostalgia)
  timelineActive: false,
  timelineRange: [],
  timelineSelectedIndex: -1,
  timelinePlaying: false,
  timelineInterval: null,

  // Stato Esplora
  exploreActiveSubTab: 'tarot', // 'tarot' or 'wrapped'
  tarotNumCards: 3,
  tarotPrioritizeOld: true,
  tarotHand: [], // preferiti attualmente in mano: { bookmark, flipped }
  wrappedCurrentSlide: 0,
  wrappedStats: null,
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
  exportTabs: document.querySelectorAll('#results-container .export-tabs-nav [data-format]'),
  exportFilename: document.getElementById('export-filename'),
  codeOutputText: document.getElementById('code-output-text'),
  btnCopyCode: document.getElementById('btn-copy-code'),
  btnDownloadCode: document.getElementById('btn-download-code'),
  exportScopeBanner: document.getElementById('export-scope-banner'),
  exportScopeFolderName: document.getElementById('export-scope-folder-name'),
  optExportOnlyFolder: document.getElementById('opt-export-only-folder'),
  optCleanUrls: document.getElementById('opt-clean-urls'),

  // Elementi Albero
  treeSearchInput: document.getElementById('tree-search-input'),
  btnTreeExpandAll: document.getElementById('btn-tree-expand-all'),
  btnTreeCollapseAll: document.getElementById('btn-tree-collapse-all'),
  optTreeShowLinks: document.getElementById('opt-tree-show-links'),

  // Selettori di Modalità dell'App
  modeConvertTab: document.getElementById('mode-convert-tab'),
  modeCompareTab: document.getElementById('mode-compare-tab'),
  modeExploreTab: document.getElementById('mode-explore-tab'),
  
  // Container di visualizzazione
  convertUploadContainer: document.getElementById('convert-upload-container'),
  compareUploadContainer: document.getElementById('compare-upload-container'),
  compareResultsContainer: document.getElementById('compare-results-container'),
  exploreResultsContainer: document.getElementById('explore-results-container'),

  // Elementi Esplora
  explorePlaceholder: document.getElementById('explore-placeholder'),
  btnExploreLoadExample: document.getElementById('btn-explore-load-example'),
  exploreContent: document.getElementById('explore-content'),
  btnExploreSubTarot: document.getElementById('btn-explore-sub-tarot'),
  btnExploreSubWrapped: document.getElementById('btn-explore-sub-wrapped'),
  exploreSecTarot: document.getElementById('explore-sec-tarot'),
  exploreSecWrapped: document.getElementById('explore-sec-wrapped'),

  // Tarocchi
  optTarotCount: document.getElementById('opt-tarot-count'),
  optTarotOld: document.getElementById('opt-tarot-old'),
  btnTarotReshuffle: document.getElementById('btn-tarot-reshuffle'),
  tarotCardsGrid: document.getElementById('tarot-cards-grid'),

  // Wrapped
  wrappedStoryProgress: document.getElementById('wrapped-story-progress'),
  wrappedActiveSlideContainer: document.getElementById('wrapped-active-slide-container'),
  btnWrappedPrev: document.getElementById('btn-wrapped-prev'),
  btnWrappedNext: document.getElementById('btn-wrapped-next'),
  wrappedSlideCounter: document.getElementById('wrapped-slide-counter'),
  btnWrappedCopyReport: document.getElementById('btn-wrapped-copy-report'),
  
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
  optCompareCleanUrls: document.getElementById('opt-compare-clean-urls'),
  btnCompareCopyCode: document.getElementById('btn-compare-copy-code'),
  btnCompareDownloadCode: document.getElementById('btn-compare-download-code'),
  compareCodeOutputText: document.getElementById('compare-code-output-text'),

  // Schede vista principale
  tabBtnTable: document.getElementById('tab-btn-table'),
  tabBtnGraph: document.getElementById('tab-btn-graph'),
  secTableView: document.getElementById('sec-table-view'),
  secGraphView: document.getElementById('sec-graph-view'),
  
  // Controlli grafico
  btnGraphTypeForce: document.getElementById('btn-graph-type-force'),
  btnGraphTypeSunburst: document.getElementById('btn-graph-type-sunburst'),
  optGraphShowLinks: document.getElementById('opt-graph-show-links'),
  btnGraphReset: document.getElementById('btn-graph-reset'),

  // QR Code Modal
  qrModal: document.getElementById('qr-modal'),
  qrModalClose: document.getElementById('qr-modal-close'),
  qrModalTitle: document.getElementById('qr-modal-title'),
  qrModalUrl: document.getElementById('qr-modal-url'),
  qrCanvas: document.getElementById('qr-canvas'),
  btnQrCopyUrl: document.getElementById('btn-qr-copy-url'),
  btnQrDownload: document.getElementById('btn-qr-download'),
  
  // La Macchina del Tempo (Timeline Nostalgia)
  secTimeline: document.getElementById('sec-timeline'),
  timelineHeader: document.getElementById('timeline-header'),
  btnTimelineToggleMode: document.getElementById('btn-timeline-toggle-mode'),
  btnTimelineToggleExpand: document.getElementById('btn-timeline-toggle-expand'),
  timelineExpandIcon: document.getElementById('timeline-expand-icon'),
  timelinePeriodDisplay: document.getElementById('timeline-period-display'),
  timelineCountDisplay: document.getElementById('timeline-count-display'),
  timelineChart: document.getElementById('timeline-chart'),
  timelineSlider: document.getElementById('timeline-slider'),
  timelineTicks: document.getElementById('timeline-ticks'),
  btnTimelinePrev: document.getElementById('btn-timeline-prev'),
  btnTimelinePlay: document.getElementById('btn-timeline-play'),
  btnTimelineNext: document.getElementById('btn-timeline-next'),
};

// --- INIZIALIZZAZIONE ---
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  setupInterfaceAccessibility();
});

// Keep selection feedback available to keyboard and assistive technology users.
function syncControlStates() {
  document.querySelectorAll('.btn-tab-mode, .btn-toggle, .btn-tab').forEach(button => {
    button.setAttribute('aria-pressed', String(button.classList.contains('active')));
  });
  elements.tableHeaders.forEach(header => {
    if (header.dataset.sort) header.setAttribute('aria-sort',
      header.dataset.sort === appState.sortColumn
        ? (appState.sortDirection === 'asc' ? 'ascending' : 'descending') : 'none');
  });
}

function setupInterfaceAccessibility() {
  document.querySelectorAll('[data-file-picker]').forEach(button => {
    button.addEventListener('click', () => document.getElementById(button.dataset.filePicker).click());
  });
  document.querySelectorAll('svg').forEach(icon => {
    if (!icon.hasAttribute('aria-label') && !icon.hasAttribute('role')) icon.setAttribute('aria-hidden', 'true');
  });
  elements.tableHeaders.forEach(header => {
    if (!header.dataset.sort) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'sort-button';
    button.title = `Tocca per ordinare per ${header.textContent.trim().toLowerCase()}`;
    while (header.firstChild) button.appendChild(header.firstChild);
    header.appendChild(button);
  });
  document.addEventListener('click', () => queueMicrotask(syncControlStates));
  syncControlStates();
}

// --- GESTIONE EVENTI ---
function setupEventListeners() {
  // Eventi per Modal QR Code
  if (elements.qrModalClose) {
    elements.qrModalClose.addEventListener('click', closeQRModal);
  }
  if (elements.qrModal) {
    elements.qrModal.addEventListener('click', (e) => {
      if (e.target === elements.qrModal) {
        closeQRModal();
      }
    });
  }
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && elements.qrModal?.classList.contains('active')) {
      const controls = [...elements.qrModal.querySelectorAll('button:not(:disabled), a[href]')];
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    if (e.key === 'Escape' && elements.qrModal && elements.qrModal.classList.contains('active')) {
      closeQRModal();
    }
  });

  // Delegazione click per tasto Genera QR
  document.addEventListener('click', (e) => {
    const qrBtn = e.target.closest('.btn-qr-action');
    if (qrBtn) {
      e.preventDefault();
      e.stopPropagation();
      const url = qrBtn.getAttribute('data-url');
      const title = qrBtn.getAttribute('data-title');
      openQRModal(url, title);
    }
  });

  if (elements.btnQrCopyUrl) {
    elements.btnQrCopyUrl.addEventListener('click', () => {
      if (!activeQRUrl) return;
      navigator.clipboard.writeText(activeQRUrl).then(() => {
        const span = elements.btnQrCopyUrl.querySelector('span');
        const originalText = span.textContent;
        span.textContent = 'Copiato!';
        elements.btnQrCopyUrl.style.borderColor = 'var(--accent-blue)';
        elements.btnQrCopyUrl.style.color = 'var(--accent-blue)';
        setTimeout(() => {
          span.textContent = originalText;
          elements.btnQrCopyUrl.style.borderColor = '';
          elements.btnQrCopyUrl.style.color = '';
        }, 2000);
      }).catch(err => {
        console.error('Impossibile copiare il link:', err);
      });
    });
  }

  if (elements.btnQrDownload) {
    elements.btnQrDownload.addEventListener('click', () => {
      if (!elements.qrCanvas) return;
      try {
        const link = document.createElement('a');
        const cleanTitle = elements.qrModalTitle.textContent.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        link.download = `qrcode_${cleanTitle || 'link'}.png`;
        link.href = elements.qrCanvas.toDataURL('image/png');
        link.click();
      } catch (err) {
        console.error('Impossibile scaricare l\'immagine:', err);
      }
    });
  }

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

  // Toggle pulizia URL nell'esportazione
  elements.optCleanUrls.addEventListener('change', (e) => {
    appState.cleanUrls = e.target.checked;
    if (appState.parsedTree.length > 0) {
      updateExportOutput();
    }
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

  // Toggle pulizia URL nell'esportazione confronto
  elements.optCompareCleanUrls.addEventListener('change', (e) => {
    appState.compareCleanUrls = e.target.checked;
    if (appState.comparisonResults) {
      updateCompareExportOutput();
    }
  });

  // Tab di visualizzazione principale
  elements.tabBtnTable.addEventListener('click', () => switchContentView('table'));
  elements.tabBtnGraph.addEventListener('click', () => switchContentView('graph'));

  // Controlli del grafico
  elements.btnGraphTypeForce.addEventListener('click', () => switchGraphType('force'));
  elements.btnGraphTypeSunburst.addEventListener('click', () => switchGraphType('sunburst'));
  elements.optGraphShowLinks.addEventListener('change', (e) => {
    appState.graphShowLinks = e.target.checked;
    renderVisuals();
  });
  elements.btnGraphReset.addEventListener('click', () => {
    graphResetZoom();
  });

  // La Macchina del Tempo Event Listeners
  if (elements.btnTimelineToggleMode) {
    elements.btnTimelineToggleMode.addEventListener('click', toggleTimelineMode);
  }
  if (elements.timelineSlider) {
    elements.timelineSlider.addEventListener('input', handleTimelineSliderInput);
    elements.timelineSlider.addEventListener('change', handleTimelineSliderChange);
  }
  if (elements.btnTimelinePrev) {
    elements.btnTimelinePrev.addEventListener('click', () => navigateTimeline(-1));
  }
  if (elements.btnTimelineNext) {
    elements.btnTimelineNext.addEventListener('click', () => navigateTimeline(1));
  }
  if (elements.btnTimelinePlay) {
    elements.btnTimelinePlay.addEventListener('click', toggleTimelinePlay);
  }
  if (elements.timelineHeader) {
    elements.timelineHeader.addEventListener('click', (e) => {
      if (e.target.closest('#btn-timeline-toggle-mode') || e.target.closest('#btn-timeline-toggle-expand')) {
        return;
      }
      toggleTimelineCollapse();
    });
  }
  if (elements.btnTimelineToggleExpand) {
    elements.btnTimelineToggleExpand.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTimelineCollapse();
    });
  }

  // Eventi per modalità Esplora
  if (elements.modeExploreTab) {
    elements.modeExploreTab.addEventListener('click', () => switchAppMode('explore'));
  }
  if (elements.btnExploreLoadExample) {
    elements.btnExploreLoadExample.addEventListener('click', loadExampleFile);
  }
  if (elements.btnExploreSubTarot) {
    elements.btnExploreSubTarot.addEventListener('click', () => switchExploreSubTab('tarot'));
  }
  if (elements.btnExploreSubWrapped) {
    elements.btnExploreSubWrapped.addEventListener('click', () => switchExploreSubTab('wrapped'));
  }
  if (elements.optTarotCount) {
    elements.optTarotCount.addEventListener('change', (e) => {
      appState.tarotNumCards = parseInt(e.target.value);
      reshuffleTarot();
    });
  }
  if (elements.optTarotOld) {
    elements.optTarotOld.addEventListener('change', (e) => {
      appState.tarotPrioritizeOld = e.target.checked;
      reshuffleTarot();
    });
  }
  if (elements.btnTarotReshuffle) {
    elements.btnTarotReshuffle.addEventListener('click', reshuffleTarot);
  }
  if (elements.btnWrappedPrev) {
    elements.btnWrappedPrev.addEventListener('click', () => navigateWrappedSlide(-1));
  }
  if (elements.btnWrappedNext) {
    elements.btnWrappedNext.addEventListener('click', () => navigateWrappedSlide(1));
  }
  if (elements.btnWrappedCopyReport) {
    elements.btnWrappedCopyReport.addEventListener('click', copyWrappedReport);
  }
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

function processUploadedFileBuffer(fileName, arrayBuffer) {
  const uint8 = new Uint8Array(arrayBuffer);
  
  // 1. Rileva header mozLz40\0 (8 byte)
  const magic = [109, 111, 122, 76, 122, 52, 48, 0]; // "mozLz40\0"
  let isMozLz4 = uint8.length >= 8;
  if (isMozLz4) {
    for (let i = 0; i < 8; i++) {
      if (uint8[i] !== magic[i]) {
        isMozLz4 = false;
        break;
      }
    }
  }

  if (isMozLz4) {
    try {
      const decompressed = decompressMozLz4(uint8);
      return {
        text: decompressed,
        status: "Backup Firefox compresso (.jsonlz4) decodificato"
      };
    } catch (err) {
      console.error("LZ4 Decompression failed:", err);
      throw new Error("Impossibile decomprimere il file .jsonlz4. Il file potrebbe essere corrotto.");
    }
  }

  // 2. Altrimenti, decodifica come testo UTF-8
  const text = new TextDecoder("utf-8").decode(uint8);
  const trimmed = text.trim();

  // Controlla se è JSON
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const json = JSON.parse(trimmed);
      if (json.roots) {
        return {
          text: text,
          status: "Preferiti Chrome (JSON) rilevati"
        };
      } else if (json.children || json.guid || json.root === 'placesRoot') {
        return {
          text: text,
          status: "Backup preferiti Firefox (JSON) rilevato"
        };
      } else {
        return {
          text: text,
          status: "File JSON rilevato"
        };
      }
    } catch (e) {
      // Non è un JSON valido, tratta come testo/HTML
    }
  }

  return {
    text: text,
    status: "File preferiti HTML caricato"
  };
}

function handleSelectedFile(file) {
  elements.selectedFileInfo.textContent = `Selezionato: ${file.name} (${formatBytes(file.size)})`;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const result = processUploadedFileBuffer(file.name, e.target.result);
      appState.originalHtml = result.text;
      elements.selectedFileInfo.textContent = `Selezionato: ${file.name} (${formatBytes(file.size)}) - ${result.status}`;
      showToast(`${result.status} con successo!`);
    } catch (err) {
      showToast('Errore di caricamento: ' + err.message);
      elements.selectedFileInfo.textContent = `Errore: ${err.message}`;
    }
  };
  reader.readAsArrayBuffer(file);
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
  setTimeout(() => {
    try {
      // 1. Parsing ad albero
      console.log('[v2.1.0] HTML len:', htmlContent ? htmlContent.length : 0);
      const rawTree = parseBookmarks(htmlContent);
      console.log('[v2.1.0] RawTree nodi:', rawTree ? rawTree.length : 0);
      if (!rawTree || rawTree.length === 0) {
        throw new Error('Nessun preferito estratto. Assicurati che sia un file di preferiti HTML valido.');
      }
      
      // 2. Applicazione formattazione date desiderata sul file originale
      appState.parsedTree = formatTreeDates(rawTree, appState.dateFormat);
      
      // Inizializza gli stati di espansione e calcola i conteggi dei preferiti per cartella
      initTreeNodesState(appState.parsedTree);
      computeFolderCounts(appState.parsedTree);
      
      appState.flatBookmarks = flattenBookmarks(appState.parsedTree);
      
      // Inizializza La Macchina del Tempo (Timeline Nostalgia)
      initTimeline();
      
      // 3. Calcolo e aggiornamento statistiche
      updateStats();
      
      // 4. Rendering albero sidebar
      renderFolderTree();
      
      // 5. Filtri e rendering tabella
      appState.currentPage = 1;
      appState.activeFolderFilter = null; // Resetta filtro cartella
      applyFiltersAndRenderTable();
      renderVisuals();
      
      // Generazione file esportazione
      updateExportOutput();
      
      // Reset dei dati della scheda Esplora
      appState.wrappedStats = null;
      appState.tarotHand = [];
      if (appState.currentMode === 'explore') {
        updateExploreTabUI();
      }
      
      // Mostra pannello risultati solo in modalità convert
      if (appState.currentMode === 'convert') {
        elements.resultsContainer.classList.remove('hidden');
      }
      hideLoader();
      showToast('Preferiti convertiti con successo!');
      
      if (shouldScroll && appState.currentMode === 'convert') {
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
    renderVisuals();
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
        renderVisuals();
      });
      
      parentEl.appendChild(nodeEl);
      
    } else if (node.type === 'bookmark' && appState.showLinksInTree) {
      if (query && !node.isMatched) {
        return;
      }
      
      const linkEl = document.createElement('a');
      linkEl.href = safeBookmarkUrl(node.url) || '#';
      linkEl.target = '_blank';
      linkEl.rel = 'noopener noreferrer';
      linkEl.className = 'tree-bookmark-node';
      if (query && node.isMatched) {
        linkEl.classList.add('highlighted');
      }
      
      let faviconHtml = '';
      if (node.icon) {
        faviconHtml = `<img class="bookmark-favicon" src="${escapeHTML(node.icon)}" alt="" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 fill=%22none%22 viewBox=%220 0 24 24%22 stroke=%22currentColor%22 stroke-width=%222%22><path d=%22M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71%22/></svg>'">`;
      } else {
        faviconHtml = `<svg class="bookmark-favicon text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="padding: 2px;">
          <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
        </svg>`;
      }
      
      linkEl.innerHTML = `
        ${faviconHtml}
        <span class="bookmark-title" title="${escapeHTML(node.title)}">${escapeHTML(node.title)}</span>
        <button type="button" class="btn-qr-action" title="Genera Codice QR" data-url="${escapeHTML(node.url)}" data-title="${escapeHTML(node.title)}">
          <svg class="icon-qr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1"></rect>
            <rect x="14" y="3" width="7" height="7" rx="1"></rect>
            <rect x="3" y="14" width="7" height="7" rx="1"></rect>
            <path d="M14 14h2v2h-2zM18 14h3v3h-3zM14 18h3v3h-3zM20 18h1v1h-1zM18 20h2v1h-2zM14 16h2v2h-2zM16 16h2v2h-2z"></path>
          </svg>
        </button>
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

  // 3. Filtro temporale (La Macchina del Tempo)
  if (appState.timelineActive && appState.timelineSelectedIndex >= 0) {
    const activePeriod = appState.timelineRange[appState.timelineSelectedIndex];
    if (activePeriod) {
      result = result.filter(b => {
        if (!b.rawAddDate) return false;
        const d = new Date(b.rawAddDate);
        if (isNaN(d.getTime())) return false;
        return d.getFullYear() === activePeriod.year && (d.getMonth() + 1) === activePeriod.month;
      });
    }
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
      ? `<span class="folder-tag" title="${escapeHTML(bookmark.folderPath.join(' / '))}">${escapeHTML(bookmark.folderPath[bookmark.folderPath.length - 1])}</span>`
      : `<span class="text-muted">—</span>`;
      
    // Costruzione Favicon
    let faviconHtml = '';
    if (bookmark.icon) {
      faviconHtml = `<img class="bookmark-favicon" src="${escapeHTML(bookmark.icon)}" alt="" onerror="this.style.display='none'">`;
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
      <td class="col-title" title="${escapeHTML(bookmark.title)}">
        <div class="table-title-container">
          ${faviconHtml}
          <span class="bookmark-title-text">${escapeHTML(bookmark.title)}</span>
          <button type="button" class="btn-qr-action" title="Genera Codice QR" data-url="${escapeHTML(bookmark.url)}" data-title="${escapeHTML(bookmark.title)}">
            <svg class="icon-qr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"></rect>
              <rect x="14" y="3" width="7" height="7" rx="1"></rect>
              <rect x="3" y="14" width="7" height="7" rx="1"></rect>
              <path d="M14 14h2v2h-2zM18 14h3v3h-3zM14 18h3v3h-3zM20 18h1v1h-1zM18 20h2v1h-2zM14 16h2v2h-2zM16 16h2v2h-2z"></path>
            </svg>
          </button>
        </div>
      </td>
      <td class="col-url" title="${escapeHTML(bookmark.url)}">
        <a href="${escapeHTML(safeBookmarkUrl(bookmark.url) || '#')}" target="_blank" rel="noopener noreferrer">${escapeHTML(bookmark.url)}</a>
      </td>
      <td class="col-date" style="color: var(--text-secondary); font-size: 0.8rem;">${escapeHTML(displayDate)}</td>
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

  // Applica filtro icone e pulizia URL in base alle opzioni dello stato
  const cleanTree = cleanDataForExport(sourceTree, appState.excludeIcons, appState.cleanUrls);
  const cleanFlat = cleanDataForExport(sourceFlat, appState.excludeIcons, appState.cleanUrls);

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

/**
 * Rimuove i parametri di tracciamento superflui da un URL per rispetto della privacy.
 */
function cleanUrl(urlStr) {
  if (!urlStr) return urlStr;
  try {
    // Gestione di URL speciali come javascript:, data:, chrome:, about:
    if (/^(javascript:|data:|chrome:|about:|file:)/i.test(urlStr)) {
      return urlStr;
    }
    
    // Per gestire URL relativi ed evitare errori, se non iniziano con http o ftp,
    // proviamo a effettuare il parsing impostando un base fittizio
    let parsedUrl;
    let isRelative = false;
    try {
      parsedUrl = new URL(urlStr);
    } catch (e) {
      parsedUrl = new URL(urlStr, 'http://dummy.xyz');
      isRelative = true;
    }
    
    const paramsToExclude = [
      /^utm_/i,
      /^fbclid$/i,
      /^gclid$/i,
      /^gclsrc$/i,
      /^dclid$/i,
      /^msclkid$/i,
      /^yclid$/i,
      /^mc_eid$/i,
      /^mc_cid$/i,
      /^_hsenc$/i,
      /^_hsmi$/i,
      /^hsCtaTracking$/i,
      /^mkt_tok$/i,
      /^ref$/i,
      /^ref_/i,
      /^twclid$/i,
      /^ttclid$/i,
      /^li_fat_id$/i,
      /^igshid$/i,
      /^si$/i
    ];
    
    const searchParams = parsedUrl.searchParams;
    const keysToDelete = [];
    for (const key of searchParams.keys()) {
      if (paramsToExclude.some(regex => regex.test(key))) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => searchParams.delete(key));
    
    // Controlliamo se c'è un hash e se contiene parametri di tracciamento
    if (parsedUrl.hash) {
      const hashParts = parsedUrl.hash.split('?');
      if (hashParts.length > 1) {
        const hashParams = new URLSearchParams(hashParts[1]);
        const hashKeysToDelete = [];
        for (const key of hashParams.keys()) {
          if (paramsToExclude.some(regex => regex.test(key))) {
            hashKeysToDelete.push(key);
          }
        }
        hashKeysToDelete.forEach(key => hashParams.delete(key));
        const newHashQuery = hashParams.toString();
        parsedUrl.hash = hashParts[0] + (newHashQuery ? '?' + newHashQuery : '');
      }
    }
    
    if (isRelative) {
      return parsedUrl.pathname + parsedUrl.search + parsedUrl.hash;
    }
    
    return parsedUrl.toString();
  } catch (err) {
    return urlStr;
  }
}

function cleanDataForExport(data, excludeIcons, cleanUrls) {
  // Funzione ricorsiva per ripulire le icone, gli URL ed evitare modifiche in-place
  if (Array.isArray(data)) {
    return data.map(item => cleanDataForExport(item, excludeIcons, cleanUrls));
  } else if (typeof data === 'object' && data !== null) {
    const cleaned = { ...data };
    if (excludeIcons && 'icon' in cleaned) {
      delete cleaned.icon;
    }
    if (cleanUrls && 'url' in cleaned) {
      cleaned.url = cleanUrl(cleaned.url);
    }
    if ('children' in cleaned && Array.isArray(cleaned.children)) {
      cleaned.children = cleanDataForExport(cleaned.children, excludeIcons, cleanUrls);
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
      if (!formattedNode.rawAddDate) {
        formattedNode.rawAddDate = node.rawAddDate || node.addDate;
      }
      formattedNode.addDate = formatSingleDate(formattedNode.rawAddDate, formatType);
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
  const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 800; // ms
  const startTime = performance.now();
  const startValue = parseInt(element.textContent) || 0;
  
  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = duration === 0 ? 1 : Math.min(elapsed / duration, 1);
    
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
  const isError = /errore|nessun|carica entrambi/i.test(message);
  toast.classList.toggle('toast-error', isError);
  toast.setAttribute('role', isError ? 'alert' : 'status');
  const text = document.createElement('span');
  text.textContent = message;
  toast.appendChild(text);
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'toast-close';
  close.setAttribute('aria-label', 'Chiudi notifica');
  close.textContent = '×';
  close.addEventListener('click', () => toast.remove());
  toast.appendChild(close);
  document.body.appendChild(toast);
  
  // Rimuove dopo 3 secondi
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s ease';
    setTimeout(() => toast.remove(), 500);
  }, isError ? 10000 : 6000);
}

// ==========================================
// FUNZIONALITÀ DI CONFRONTO FILE (COMPARE)
// ==========================================

function switchAppMode(mode) {
  appState.currentMode = mode;
  const copy = {
    convert: ['01 / IMPORTA I PREFERITI', 'Da un file a una raccolta organizzata', 'Carica l’esportazione del tuo browser, poi scegli il formato da scaricare.'],
    compare: ['01 / SCEGLI DUE VERSIONI', 'Scopri cosa è cambiato', 'Carica la versione precedente nel file A e quella aggiornata nel file B.'],
    explore: ['RISCOPRI LA TUA RACCOLTA', 'Dai una seconda vita ai tuoi link', 'Usa i preferiti già caricati o prova un esempio nella sezione qui sotto.']
  }[mode];
  document.getElementById('upload-eyebrow').textContent = copy[0];
  document.getElementById('title-upload').textContent = copy[1];
  document.getElementById('upload-description').textContent = copy[2];
  
  // Rimuovi classe active da tutti i tab
  elements.modeConvertTab.classList.remove('active');
  elements.modeCompareTab.classList.remove('active');
  if (elements.modeExploreTab) elements.modeExploreTab.classList.remove('active');
  
  // Nascondi tutti i container principali
  elements.convertUploadContainer.classList.add('hidden');
  elements.compareUploadContainer.classList.add('hidden');
  elements.resultsContainer.classList.add('hidden');
  elements.compareResultsContainer.classList.add('hidden');
  if (elements.exploreResultsContainer) elements.exploreResultsContainer.classList.add('hidden');
  
  if (mode === 'convert') {
    elements.modeConvertTab.classList.add('active');
    elements.convertUploadContainer.classList.remove('hidden');
    if (appState.parsedTree.length > 0) {
      elements.resultsContainer.classList.remove('hidden');
    }
  } else if (mode === 'compare') {
    elements.modeCompareTab.classList.add('active');
    elements.compareUploadContainer.classList.remove('hidden');
    if (appState.comparisonResults) {
      elements.compareResultsContainer.classList.remove('hidden');
    }
  } else if (mode === 'explore') {
    if (elements.modeExploreTab) elements.modeExploreTab.classList.add('active');
    if (elements.exploreResultsContainer) {
      elements.exploreResultsContainer.classList.remove('hidden');
    }
    updateExploreTabUI();
  }
  syncControlStates();
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
    try {
      const result = processUploadedFileBuffer(file.name, e.target.result);
      if (fileKey === 'A') {
        appState.fileA.rawHtml = result.text;
        appState.fileA.name = file.name;
        appState.fileA.size = file.size;
      } else {
        appState.fileB.rawHtml = result.text;
        appState.fileB.name = file.name;
        appState.fileB.size = file.size;
      }
      infoEl.textContent = `Selezionato: ${file.name} (${formatBytes(file.size)}) - ${result.status}`;
      showToast(`File ${fileKey} caricato come ${result.status}!`);
    } catch (err) {
      showToast(`Errore caricamento File ${fileKey}: ` + err.message);
      infoEl.textContent = `Errore: ${err.message}`;
    }
  };
  reader.readAsArrayBuffer(file);
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
        ? `<span class="folder-tag" title="${escapeHTML(item.folderPath.join(' / '))}">${escapeHTML(item.folderPath[item.folderPath.length - 1])}</span>`
        : `<span class="text-muted">—</span>`;
    } else if (item.status === 'removed') {
      folderHtml = item.folderPath.length > 0 
        ? `<span class="folder-tag diff-old" title="${escapeHTML(item.folderPath.join(' / '))}">${escapeHTML(item.folderPath[item.folderPath.length - 1])}</span>`
        : `<span class="text-muted">—</span>`;
    } else if (item.status === 'modified') {
      if (item.folderChanged) {
        const oldFolder = item.oldFolderPath.length > 0 ? item.oldFolderPath[item.oldFolderPath.length - 1] : 'Radice';
        const newFolder = item.newFolderPath.length > 0 ? item.newFolderPath[item.newFolderPath.length - 1] : 'Radice';
        folderHtml = `
          <div class="diff-container">
            <span class="folder-tag diff-old" title="${escapeHTML(item.oldFolderPath.join(' / '))}">${escapeHTML(oldFolder)}</span>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin: 0.1rem 0;">&darr; spostato in</div>
            <span class="folder-tag diff-new" title="${escapeHTML(item.newFolderPath.join(' / '))}">${escapeHTML(newFolder)}</span>
          </div>
        `;
      } else {
        folderHtml = item.newFolderPath.length > 0 
          ? `<span class="folder-tag" title="${escapeHTML(item.newFolderPath.join(' / '))}">${escapeHTML(item.newFolderPath[item.newFolderPath.length - 1])}</span>`
          : `<span class="text-muted">—</span>`;
      }
    } else {
      folderHtml = item.folderPath.length > 0 
        ? `<span class="folder-tag" title="${escapeHTML(item.folderPath.join(' / '))}">${escapeHTML(item.folderPath[item.folderPath.length - 1])}</span>`
        : `<span class="text-muted">—</span>`;
    }

    // Titolo
    let titleHtml = '';
    let faviconHtml = '';
    if (item.icon) {
      faviconHtml = `<img class="bookmark-favicon" src="${escapeHTML(item.icon)}" alt="" onerror="this.style.display='none'">`;
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
      <td class="col-title">
        <div class="table-title-container">
          <div style="flex: 1; min-width: 0;">${titleHtml}</div>
          <button type="button" class="btn-qr-action" title="Genera Codice QR" data-url="${escapeHTML(item.url)}" data-title="${escapeHTML(item.title || item.newTitle || item.oldTitle || 'Preferito')}">
            <svg class="icon-qr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"></rect>
              <rect x="14" y="3" width="7" height="7" rx="1"></rect>
              <rect x="3" y="14" width="7" height="7" rx="1"></rect>
              <path d="M14 14h2v2h-2zM18 14h3v3h-3zM14 18h3v3h-3zM20 18h1v1h-1zM18 20h2v1h-2zM14 16h2v2h-2zM16 16h2v2h-2z"></path>
            </svg>
          </button>
        </div>
      </td>
      <td class="col-url" title="${escapeHTML(item.url)}">
        <a href="${escapeHTML(safeBookmarkUrl(item.url) || '#')}" target="_blank" rel="noopener noreferrer">${escapeHTML(item.url)}</a>
      </td>
      <td class="col-date" style="color: var(--text-secondary); font-size: 0.8rem;">${escapeHTML(displayDate)}</td>
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
    added: cleanDataForExport(appState.comparisonResults.added, appState.compareExcludeIcons, appState.compareCleanUrls),
    removed: cleanDataForExport(appState.comparisonResults.removed, appState.compareExcludeIcons, appState.compareCleanUrls),
    modified: cleanDataForExport(appState.comparisonResults.modified, appState.compareExcludeIcons, appState.compareCleanUrls),
    identical: cleanDataForExport(appState.comparisonResults.identical, appState.compareExcludeIcons, appState.compareCleanUrls)
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

// --- GESTIONE VISTA GRAFICA ---
function switchContentView(view) {
  appState.currentView = view;
  if (view === 'table') {
    elements.tabBtnTable.classList.add('active');
    elements.tabBtnGraph.classList.remove('active');
    elements.secTableView.classList.remove('hidden');
    elements.secGraphView.classList.add('hidden');
  } else {
    elements.tabBtnTable.classList.remove('active');
    elements.tabBtnGraph.classList.add('active');
    elements.secTableView.classList.add('hidden');
    elements.secGraphView.classList.remove('hidden');
    renderVisuals();
  }
}

function switchGraphType(type) {
  appState.graphType = type;
  if (type === 'force') {
    elements.btnGraphTypeForce.classList.add('active');
    elements.btnGraphTypeSunburst.classList.remove('active');
  } else {
    elements.btnGraphTypeForce.classList.remove('active');
    elements.btnGraphTypeSunburst.classList.add('active');
  }
  renderVisuals();
}

function renderVisuals() {
  if (appState.currentView !== 'graph' || !appState.parsedTree || appState.parsedTree.length === 0) return;
  
  let graphData = appState.parsedTree;
  let rootTitle = "Tutti i Preferiti";
  
  if (appState.activeFolderFilter && appState.activeFolderFilter.length > 0) {
    const folderNode = findFolderByPath(appState.parsedTree, appState.activeFolderFilter);
    if (folderNode) {
      graphData = folderNode;
      rootTitle = folderNode.title;
    }
  }
  
  renderVisualGraph('graph-canvas-container', graphData, {
    graphType: appState.graphType,
    showLinks: appState.graphShowLinks,
    rootTitle: rootTitle
  }, (selectedPath) => {
    selectFolderByPath(selectedPath);
  });
}

function findFolderByPath(nodes, path) {
  if (!path || path.length === 0) return null;
  const targetName = path[0];
  const remaining = path.slice(1);
  
  for (const node of nodes) {
    if (node.type === 'folder' && node.title === targetName) {
      if (remaining.length === 0) {
        return node;
      } else {
        return findFolderByPath(node.children, remaining);
      }
    }
  }
  return null;
}

function expandFolderByPath(nodes, path) {
  if (!path || path.length === 0) return;
  const targetName = path[0];
  const remaining = path.slice(1);
  
  for (const node of nodes) {
    if (node.type === 'folder' && node.title === targetName) {
      node.expanded = true;
      expandFolderByPath(node.children, remaining);
      break;
    }
  }
}

function selectFolderByPath(folderPath) {
  appState.activeFolderFilter = folderPath;
  appState.currentPage = 1;
  
  // Espande e evidenzia lo stato attivo nell'albero sidebar
  expandFolderByPath(appState.parsedTree, folderPath);
  renderFolderTree();
  
  // Applica filtri
  applyFiltersAndRenderTable();
  updateExportScopeBanner();
  
  // Ri-disegna il grafico per rispecchiare la nuova selezione
  renderVisuals();
}

// --- LOGICA MODAL GENERATORE QR CODE ---
let activeQRUrl = '';
let qrReturnFocus = null;
let qrInertElements = [];
let qrPreviousOverflow = '';

function openQRModal(url, title) {
  qrReturnFocus = document.activeElement;
  activeQRUrl = url;
  if (elements.qrModalTitle) elements.qrModalTitle.textContent = title || 'QR Code';
  if (elements.qrModalUrl) elements.qrModalUrl.textContent = url;
  
  // Genera il codice QR
  try {
    new QRious({
      element: elements.qrCanvas,
      value: url,
      size: 220,
      level: 'H',
      foreground: '#060914',
      background: '#ffffff'
    });
  } catch (err) {
    console.error('Errore nella generazione del QR Code:', err);
  }
  
  if (elements.qrModal) {
    elements.qrModal.classList.add('active');
    elements.qrModal.setAttribute('aria-hidden', 'false');
    qrInertElements = [...document.querySelectorAll('.app-header, .app-container, .app-footer, .skip-link')]
      .filter(element => !element.inert);
    qrInertElements.forEach(element => { element.inert = true; });
    qrPreviousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    elements.qrModalClose.focus();
  }
}

function closeQRModal() {
  if (elements.qrModal) {
    elements.qrModal.classList.remove('active');
    elements.qrModal.setAttribute('aria-hidden', 'true');
    qrInertElements.forEach(element => { element.inert = false; });
    qrInertElements = [];
    document.body.style.overflow = qrPreviousOverflow;
    if (qrReturnFocus?.isConnected) qrReturnFocus.focus();
  }
}

// --- LA MACCHINA DEL TEMPO (TIMELINE NOSTALGIA) ---

function initTimeline() {
  const bookmarksWithDates = appState.flatBookmarks.filter(b => b.rawAddDate);
  
  if (bookmarksWithDates.length === 0) {
    if (elements.secTimeline) elements.secTimeline.style.display = 'none';
    appState.timelineActive = false;
    appState.timelineRange = [];
    appState.timelineSelectedIndex = -1;
    stopTimelinePlay();
    return;
  }
  
  const dateGroups = {};
  bookmarksWithDates.forEach(b => {
    const d = new Date(b.rawAddDate);
    if (isNaN(d.getTime())) return;
    const year = d.getFullYear();
    const month = d.getMonth() + 1; // 1-indexed
    const key = `${year}-${String(month).padStart(2, '0')}`;
    if (!dateGroups[key]) {
      dateGroups[key] = {
        key,
        year,
        month,
        count: 0
      };
    }
    dateGroups[key].count++;
  });
  
  const keys = Object.keys(dateGroups).sort();
  if (keys.length === 0) {
    if (elements.secTimeline) elements.secTimeline.style.display = 'none';
    appState.timelineActive = false;
    appState.timelineRange = [];
    appState.timelineSelectedIndex = -1;
    stopTimelinePlay();
    return;
  }
  
  const firstKey = keys[0];
  const lastKey = keys[keys.length - 1];
  
  const [startYear, startMonth] = firstKey.split('-').map(Number);
  const [endYear, endMonth] = lastKey.split('-').map(Number);
  
  const monthsList = [
    'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
    'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
  ];
  
  const fullRange = [];
  let currYear = startYear;
  let currMonth = startMonth;
  
  while (currYear < endYear || (currYear === endYear && currMonth <= endMonth)) {
    const key = `${currYear}-${String(currMonth).padStart(2, '0')}`;
    const count = dateGroups[key] ? dateGroups[key].count : 0;
    fullRange.push({
      key,
      year: currYear,
      month: currMonth,
      label: `${monthsList[currMonth - 1]} ${currYear}`,
      count
    });
    
    currMonth++;
    if (currMonth > 12) {
      currMonth = 1;
      currYear++;
    }
  }
  
  appState.timelineRange = fullRange;
  // Default: seleziona il primo mese in cui ci sono preferiti salvati, o l'ultimo se si preferisce.
  // Trova il primo mese non vuoto
  const firstNonEmptyIdx = fullRange.findIndex(r => r.count > 0);
  appState.timelineSelectedIndex = firstNonEmptyIdx >= 0 ? firstNonEmptyIdx : 0;
  
  // Resetta stato attivo
  appState.timelineActive = false;
  if (elements.btnTimelineToggleMode) {
    elements.btnTimelineToggleMode.classList.remove('active');
    elements.btnTimelineToggleMode.textContent = 'Attiva Filtro Temporale';
  }
  stopTimelinePlay();
  
  // Rendi visibile e collassato
  if (elements.secTimeline) {
    elements.secTimeline.classList.add('collapsed');
    elements.secTimeline.style.display = 'block';
  }
  if (elements.timelineExpandIcon) {
    elements.timelineExpandIcon.style.transform = 'rotate(-90deg)';
  }
  
  renderTimelineUI();
}

function renderTimelineUI() {
  const range = appState.timelineRange;
  if (!range || range.length === 0) return;
  
  // Configura lo slider
  if (elements.timelineSlider) {
    elements.timelineSlider.min = 0;
    elements.timelineSlider.max = range.length - 1;
    elements.timelineSlider.value = appState.timelineSelectedIndex;
    elements.timelineSlider.disabled = !appState.timelineActive;
  }
  
  // Configura i pulsanti player
  if (appState.timelineActive) {
    if (elements.btnTimelinePrev) elements.btnTimelinePrev.disabled = appState.timelineSelectedIndex <= 0;
    if (elements.btnTimelineNext) elements.btnTimelineNext.disabled = appState.timelineSelectedIndex >= range.length - 1;
    if (elements.btnTimelinePlay) elements.btnTimelinePlay.disabled = false;
  } else {
    if (elements.btnTimelinePrev) elements.btnTimelinePrev.disabled = true;
    if (elements.btnTimelineNext) elements.btnTimelineNext.disabled = true;
    if (elements.btnTimelinePlay) elements.btnTimelinePlay.disabled = true;
  }
  
  // Renderizza istogramma
  if (elements.timelineChart) {
    elements.timelineChart.innerHTML = '';
    const maxCount = Math.max(...range.map(r => r.count), 1);
    
    range.forEach((item, idx) => {
      const bar = document.createElement('div');
      bar.className = 'timeline-chart-bar';
      if (appState.timelineSelectedIndex === idx && appState.timelineActive) {
        bar.classList.add('active');
      }
      
      // Calcola l'altezza percentuale
      const pct = (item.count / maxCount) * 100;
      bar.style.height = `${Math.max(pct, item.count > 0 ? 8 : 2)}%`;
      
      // Colore speciale per indicare densità
      if (item.count > 0) {
        bar.style.backgroundColor = `hsla(263, 84%, ${Math.min(50 + pct/2, 75)}%, ${0.4 + (pct/100)*0.5})`;
      }
      
      bar.setAttribute('data-tooltip', `${item.label}: ${item.count} preferiti`);
      
      // Seleziona al click
      bar.addEventListener('click', () => {
        if (!appState.timelineActive) {
          toggleTimelineMode();
        }
        selectTimelineIndex(idx);
      });
      
      elements.timelineChart.appendChild(bar);
    });
  }
  
  // Tick temporali
  if (elements.timelineTicks) {
    elements.timelineTicks.innerHTML = '';
    
    const yearsAdded = new Set();
    // Calcola quanti anni ci sono nel range
    const allYears = Array.from(new Set(range.map(r => r.year)));
    
    // Decidi il passo ideale per mostrare le etichette degli anni
    let step = 1;
    if (allYears.length > 10) step = 2;
    if (allYears.length > 20) step = 5;
    
    range.forEach((item, idx) => {
      // Mostra l'anno al cambio d'anno o ai limiti
      if (!yearsAdded.has(item.year) && item.month === 1) {
        const yearIdx = allYears.indexOf(item.year);
        if (yearIdx % step === 0 || idx === 0 || idx === range.length - 1) {
          const tick = document.createElement('span');
          tick.className = 'timeline-tick-label';
          tick.style.cursor = 'pointer';
          tick.textContent = String(item.year);
          tick.addEventListener('click', () => {
            if (!appState.timelineActive) {
              toggleTimelineMode();
            }
            selectTimelineIndex(idx);
          });
          elements.timelineTicks.appendChild(tick);
          yearsAdded.add(item.year);
        }
      }
    });
    
    // Assicurati che ci sia almeno un tick per l'inizio e uno per la fine se vuoto
    if (elements.timelineTicks.children.length === 0 && range.length > 0) {
      const firstTick = document.createElement('span');
      firstTick.className = 'timeline-tick-label';
      firstTick.textContent = range[0].label;
      elements.timelineTicks.appendChild(firstTick);
      
      if (range.length > 1) {
        const lastTick = document.createElement('span');
        lastTick.className = 'timeline-tick-label';
        lastTick.textContent = range[range.length - 1].label;
        elements.timelineTicks.appendChild(lastTick);
      }
    }
  }
  
  updateTimelinePeriodDisplay();
}

function updateTimelinePeriodDisplay() {
  const idx = appState.timelineSelectedIndex;
  const range = appState.timelineRange;
  
  if (idx < 0 || !range || range[idx] === undefined) {
    if (elements.timelinePeriodDisplay) elements.timelinePeriodDisplay.textContent = '—';
    if (elements.timelineCountDisplay) elements.timelineCountDisplay.textContent = '0';
    return;
  }
  
  const period = range[idx];
  if (elements.timelinePeriodDisplay) elements.timelinePeriodDisplay.textContent = period.label;
  if (elements.timelineCountDisplay) elements.timelineCountDisplay.textContent = String(period.count);
}

function toggleTimelineMode() {
  appState.timelineActive = !appState.timelineActive;
  
  if (elements.btnTimelineToggleMode) {
    if (appState.timelineActive) {
      elements.btnTimelineToggleMode.classList.add('active');
      elements.btnTimelineToggleMode.textContent = 'Filtro Temporale Attivo';
      
      // Auto-expand if currently collapsed
      if (elements.secTimeline && elements.secTimeline.classList.contains('collapsed')) {
        toggleTimelineCollapse();
      }
    } else {
      elements.btnTimelineToggleMode.classList.remove('active');
      elements.btnTimelineToggleMode.textContent = 'Attiva Filtro Temporale';
      stopTimelinePlay();
    }
  }
  
  // Abilita/disabilita lo slider
  if (elements.timelineSlider) {
    elements.timelineSlider.disabled = !appState.timelineActive;
  }
  
  // Aggiorna controlli ed esegui filtri
  selectTimelineIndex(appState.timelineSelectedIndex >= 0 ? appState.timelineSelectedIndex : 0);
}

function selectTimelineIndex(idx) {
  if (idx < 0 || !appState.timelineRange || idx >= appState.timelineRange.length) return;
  
  appState.timelineSelectedIndex = idx;
  
  // Sincronizza lo slider
  if (elements.timelineSlider) {
    elements.timelineSlider.value = idx;
  }
  
  // Sincronizza stato pulsanti
  if (appState.timelineActive) {
    if (elements.btnTimelinePrev) elements.btnTimelinePrev.disabled = idx <= 0;
    if (elements.btnTimelineNext) elements.btnTimelineNext.disabled = idx >= appState.timelineRange.length - 1;
  }
  
  // Aggiorna classi barre istogramma
  if (elements.timelineChart) {
    const bars = elements.timelineChart.children;
    for (let i = 0; i < bars.length; i++) {
      if (i === idx && appState.timelineActive) {
        bars[i].classList.add('active');
        // Le barre sono già visibili: centrarle sposterebbe anche la pagina.
      } else {
        bars[i].classList.remove('active');
      }
    }
  }
  
  updateTimelinePeriodDisplay();
  
  // Ricarica la tabella
  appState.currentPage = 1;
  applyFiltersAndRenderTable();
}

function handleTimelineSliderInput(e) {
  const idx = parseInt(e.target.value);
  selectTimelineIndex(idx);
}

function handleTimelineSliderChange(e) {
  const idx = parseInt(e.target.value);
  selectTimelineIndex(idx);
}

function navigateTimeline(direction) {
  const targetIdx = appState.timelineSelectedIndex + direction;
  if (targetIdx >= 0 && targetIdx < appState.timelineRange.length) {
    selectTimelineIndex(targetIdx);
  }
}

function toggleTimelinePlay() {
  if (appState.timelinePlaying) {
    stopTimelinePlay();
  } else {
    startTimelinePlay();
  }
}

function startTimelinePlay() {
  if (appState.timelineRange.length === 0) return;
  
  appState.timelinePlaying = true;
  if (elements.btnTimelinePlay) {
    elements.btnTimelinePlay.innerHTML = `
      <svg class="icon-xs" style="width: 14px; height: 14px; margin-right: 4px; vertical-align: middle;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>Pause</span>
    `;
    elements.btnTimelinePlay.classList.add('active');
  }
  
  // Se siamo alla fine o oltre, ripartiamo da capo o dal primo mese con preferiti
  if (appState.timelineSelectedIndex >= appState.timelineRange.length - 1) {
    const firstNonEmptyIdx = appState.timelineRange.findIndex(r => r.count > 0);
    selectTimelineIndex(firstNonEmptyIdx >= 0 ? firstNonEmptyIdx : 0);
  }
  
  appState.timelineInterval = setInterval(() => {
    if (appState.timelineSelectedIndex < appState.timelineRange.length - 1) {
      navigateTimeline(1);
    } else {
      stopTimelinePlay();
    }
  }, 1000); // 1 secondo per step
}

function stopTimelinePlay() {
  appState.timelinePlaying = false;
  if (appState.timelineInterval) {
    clearInterval(appState.timelineInterval);
    appState.timelineInterval = null;
  }
  if (elements.btnTimelinePlay) {
    elements.btnTimelinePlay.innerHTML = `
      <svg class="icon-xs" style="width: 14px; height: 14px; margin-right: 4px; vertical-align: middle;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>Play</span>
    `;
    elements.btnTimelinePlay.classList.remove('active');
  }
}

function toggleTimelineCollapse() {
  if (!elements.secTimeline) return;
  const isCollapsed = elements.secTimeline.classList.toggle('collapsed');
  
  if (elements.timelineExpandIcon) {
    if (isCollapsed) {
      elements.timelineExpandIcon.style.transform = 'rotate(-90deg)';
    } else {
      elements.timelineExpandIcon.style.transform = 'rotate(0deg)';
    }
  }
}

// ==========================================
// FUNZIONALITÀ DI ESPLORAZIONE (EXPLORE)
// ==========================================

function updateExploreTabUI() {
  const hasData = appState.flatBookmarks && appState.flatBookmarks.length > 0;
  
  if (!hasData) {
    if (elements.explorePlaceholder) elements.explorePlaceholder.classList.remove('hidden');
    if (elements.exploreContent) elements.exploreContent.classList.add('hidden');
  } else {
    if (elements.explorePlaceholder) elements.explorePlaceholder.classList.add('hidden');
    if (elements.exploreContent) elements.exploreContent.classList.remove('hidden');
    
    // Forza il caricamento del sotto-tab attivo
    switchExploreSubTab(appState.exploreActiveSubTab);
  }
}

function switchExploreSubTab(subTab) {
  appState.exploreActiveSubTab = subTab;
  
  if (subTab === 'tarot') {
    if (elements.btnExploreSubTarot) elements.btnExploreSubTarot.classList.add('active');
    if (elements.btnExploreSubWrapped) elements.btnExploreSubWrapped.classList.remove('active');
    if (elements.exploreSecTarot) elements.exploreSecTarot.classList.remove('hidden');
    if (elements.exploreSecWrapped) elements.exploreSecWrapped.classList.add('hidden');
  } else {
    if (elements.btnExploreSubTarot) elements.btnExploreSubTarot.classList.remove('active');
    if (elements.btnExploreSubWrapped) elements.btnExploreSubWrapped.classList.add('active');
    if (elements.exploreSecTarot) elements.exploreSecTarot.classList.add('hidden');
    if (elements.exploreSecWrapped) elements.exploreSecWrapped.classList.remove('hidden');
  }
  
  renderActiveExploreSubTab();
}

function renderActiveExploreSubTab() {
  if (appState.exploreActiveSubTab === 'tarot') {
    if (appState.tarotHand.length === 0) {
      reshuffleTarot();
    } else {
      renderTarotGrid();
    }
  } else if (appState.exploreActiveSubTab === 'wrapped') {
    if (!appState.wrappedStats) {
      calculateWrappedStats();
    }
    appState.wrappedCurrentSlide = 0;
    renderWrappedStory();
  }
}

function reshuffleTarot() {
  let pool = appState.flatBookmarks.filter(b => b.type === 'bookmark');
  if (pool.length === 0) {
    if (elements.tarotCardsGrid) {
      elements.tarotCardsGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 2rem;">
          Nessun preferito disponibile per i Tarocchi.
        </div>
      `;
    }
    return;
  }
  
  if (appState.tarotPrioritizeOld) {
    // Ordina per data (più vecchi prima)
    pool = [...pool].sort((a, b) => {
      const dA = a.rawAddDate ? new Date(a.rawAddDate).getTime() : 0;
      const dB = b.rawAddDate ? new Date(b.rawAddDate).getTime() : 0;
      return dA - dB;
    });
    // Limita la selezione alla metà dei più vecchi per un pizzico di randomicità focalizzata
    const halfSize = Math.max(1, Math.ceil(pool.length / 2));
    pool = pool.slice(0, halfSize);
  }
  
  // Mescola il mazzo (Fisher-Yates)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  
  const count = Math.min(appState.tarotNumCards, pool.length);
  const hand = [];
  for (let i = 0; i < count; i++) {
    hand.push({
      bookmark: pool[i],
      flipped: false
    });
  }
  
  appState.tarotHand = hand;
  renderTarotGrid();
}

function renderTarotGrid() {
  if (!elements.tarotCardsGrid) return;
  elements.tarotCardsGrid.innerHTML = '';
  
  // Cambia il numero di colonne del grid in base alle carte
  elements.tarotCardsGrid.style.display = 'grid';
  elements.tarotCardsGrid.style.gridTemplateColumns = `repeat(auto-fit, minmax(220px, 1fr))`;
  elements.tarotCardsGrid.style.maxWidth = appState.tarotNumCards === 3 ? '800px' : '1200px';
  elements.tarotCardsGrid.style.gap = '1.75rem';
  
  appState.tarotHand.forEach((card, idx) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'tarot-card animate-fade-in';
    cardEl.style.animationDelay = `${idx * 0.1}s`;
    if (card.flipped) {
      cardEl.classList.add('flipped');
    }
    
    const domain = getDomainFromUrl(card.bookmark.url);
    const dateStr = card.bookmark.addDate ? card.bookmark.addDate : 'Data sconosciuta';
    const folder = card.bookmark.folderPath && card.bookmark.folderPath.length > 0 
      ? card.bookmark.folderPath[card.bookmark.folderPath.length - 1] 
      : 'Radice';
    const fullFolderPath = card.bookmark.folderPath && card.bookmark.folderPath.length > 0
      ? card.bookmark.folderPath.join(' / ')
      : 'Cartella Radice';
      
    cardEl.innerHTML = `
      <div class="tarot-card-inner">
        <div class="tarot-card-back">
          <svg class="tarot-symbol" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            <path stroke-linecap="round" fill="currentColor" d="M12 5l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5z" style="color: hsl(40, 80%, 55%);" />
            <circle cx="7" cy="8" r="1.5" fill="currentColor" />
            <circle cx="16" cy="15" r="1" fill="currentColor" />
          </svg>
          <div class="tarot-label-mystic">Lo Leggo Dopo</div>
        </div>
        <div class="tarot-card-front">
          <div class="tarot-card-header">
            <span class="tarot-card-folder" title="${escapeHTML(fullFolderPath)}">${escapeHTML(folder)}</span>
            <span class="tarot-card-domain">${escapeHTML(domain)}</span>
          </div>
          <div class="tarot-card-body">
            <div class="tarot-card-title" title="${escapeHTML(card.bookmark.title)}">${escapeHTML(card.bookmark.title)}</div>
            <div class="tarot-card-date">Salvato: ${escapeHTML(dateStr)}</div>
          </div>
          <div class="tarot-card-actions">
            <button type="button" class="btn btn-read btn-xs" data-idx="${idx}">Leggi Ora</button>
            <button type="button" class="btn btn-postpone btn-xs" data-idx="${idx}">Rimanda</button>
            <button type="button" class="btn btn-delete btn-xs" data-idx="${idx}">Elimina</button>
          </div>
        </div>
      </div>
    `;
    
    // Click per girare la carta
    cardEl.addEventListener('click', (e) => {
      if (e.target.closest('.tarot-card-actions') || card.flipped) {
        return;
      }
      card.flipped = true;
      cardEl.classList.add('flipped');
    });
    
    // Eventi pulsanti azione
    const btnRead = cardEl.querySelector('.btn-read');
    const btnPostpone = cardEl.querySelector('.btn-postpone');
    const btnDelete = cardEl.querySelector('.btn-delete');
    
    btnRead.addEventListener('click', (e) => {
      e.stopPropagation();
      if (safeBookmarkUrl(card.bookmark.url)) {
        openBookmarkUrl(card.bookmark.url);
        showToast("Link aperto in una nuova scheda!");
      } else {
        showToast("URL non valido o protocollo non supportato.");
      }
    });
    
    btnPostpone.addEventListener('click', (e) => {
      e.stopPropagation();
      // Rigira la carta sul dorso
      card.flipped = false;
      cardEl.classList.remove('flipped');
      
      // Aspetta che si rigiri prima di pescarne una nuova
      setTimeout(() => {
        drawNewTarotCard(idx);
      }, 400);
    });
    
    btnDelete.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`Sei sicuro di voler eliminare definitivamente il preferito?\n"${card.bookmark.title}"`)) {
        cardEl.classList.add('fade-out-delete');
        setTimeout(() => {
          deleteTarotCard(idx);
        }, 600);
      }
    });
    
    elements.tarotCardsGrid.appendChild(cardEl);
  });
}

function drawNewTarotCard(idx) {
  let pool = appState.flatBookmarks.filter(b => b.type === 'bookmark');
  // Escludi quelli già presenti in mano per evitare duplicati immediati
  const urlsInHand = appState.tarotHand.map(c => c.bookmark.url);
  pool = pool.filter(b => !urlsInHand.includes(b.url));
  
  if (pool.length === 0) {
    showToast("Nessun altro preferito disponibile nel mazzo!");
    return;
  }
  
  if (appState.tarotPrioritizeOld) {
    pool = [...pool].sort((a, b) => {
      const dA = a.rawAddDate ? new Date(a.rawAddDate).getTime() : 0;
      const dB = b.rawAddDate ? new Date(b.rawAddDate).getTime() : 0;
      return dA - dB;
    });
    const halfSize = Math.max(1, Math.ceil(pool.length / 2));
    pool = pool.slice(0, halfSize);
  }
  
  // Pesca uno casuale dal pool rimasto
  const newBookmark = pool[Math.floor(Math.random() * pool.length)];
  appState.tarotHand[idx] = {
    bookmark: newBookmark,
    flipped: false
  };
  
  renderTarotGrid();
}

function deleteTarotCard(idx) {
  const cardToDelete = appState.tarotHand[idx];
  
  // 1. Rimuovi globalmente dal sistema
  deleteBookmarkGlobally(cardToDelete.bookmark);
  
  // 2. Pesca un rimpiazzo
  let pool = appState.flatBookmarks.filter(b => b.type === 'bookmark');
  const urlsInHand = appState.tarotHand.map(c => c.bookmark.url);
  pool = pool.filter(b => !urlsInHand.includes(b.url));
  
  if (pool.length === 0) {
    // Non ci sono più preferiti, togli semplicemente la carta dalla mano
    appState.tarotHand.splice(idx, 1);
  } else {
    if (appState.tarotPrioritizeOld) {
      pool = [...pool].sort((a, b) => {
        const dA = a.rawAddDate ? new Date(a.rawAddDate).getTime() : 0;
        const dB = b.rawAddDate ? new Date(b.rawAddDate).getTime() : 0;
        return dA - dB;
      });
      const halfSize = Math.max(1, Math.ceil(pool.length / 2));
      pool = pool.slice(0, halfSize);
    }
    const newBookmark = pool[Math.floor(Math.random() * pool.length)];
    appState.tarotHand[idx] = {
      bookmark: newBookmark,
      flipped: false
    };
  }
  
  showToast("Preferito eliminato con successo dal sistema!");
  renderTarotGrid();
}

function deleteBookmarkFromTree(nodes, url, title) {
  return nodes.filter(node => {
    if (node.type === 'bookmark') {
      return !(node.url === url && node.title === title);
    } else if (node.type === 'folder' && node.children) {
      node.children = deleteBookmarkFromTree(node.children, url, title);
      return true;
    }
    return true;
  });
}

function deleteBookmarkGlobally(bookmark) {
  // 1. Rimuovi dall'albero gerarchico
  appState.parsedTree = deleteBookmarkFromTree(appState.parsedTree, bookmark.url, bookmark.title);
  // 2. Re-incolla la lista piatta
  appState.flatBookmarks = flattenBookmarks(appState.parsedTree);
  // 3. Aggiorna i filtrati
  appState.filteredBookmarks = appState.filteredBookmarks.filter(b => !(b.url === bookmark.url && b.title === bookmark.title));
  
  // 4. Ricalcola le statistiche e la timeline
  updateStats();
  initTimeline();
  
  // 5. Ri-renderizza l'albero e la tabella
  renderFolderTree();
  applyFiltersAndRenderTable();
  
  // 6. Forza il ricalcolo del Wrapped
  appState.wrappedStats = null;
}

function calculateWrappedStats() {
  const bookmarks = appState.flatBookmarks.filter(b => b.type === 'bookmark');
  const total = bookmarks.length;
  
  // 1. Domini Frequenti
  const domainCounts = {};
  bookmarks.forEach(b => {
    const dom = getDomainFromUrl(b.url);
    if (dom) domainCounts[dom] = (domainCounts[dom] || 0) + 1;
  });
  
  const sortedDomains = Object.entries(domainCounts)
    .map(([domain, count]) => ({
      domain,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
    
  // 2. Analisi Orari
  const hourCounts = { night: 0, morning: 0, afternoon: 0, evening: 0 };
  let hasHours = false;
  bookmarks.forEach(b => {
    if (!b.rawAddDate) return;
    const d = new Date(b.rawAddDate);
    if (isNaN(d.getTime())) return;
    hasHours = true;
    const hr = d.getHours();
    if (hr >= 0 && hr < 6) hourCounts.night++;
    else if (hr >= 6 && hr < 12) hourCounts.morning++;
    else if (hr >= 12 && hr < 18) hourCounts.afternoon++;
    else hourCounts.evening++;
  });
  
  let dominantTime = 'afternoon';
  let maxTimeCount = 0;
  Object.entries(hourCounts).forEach(([k, v]) => {
    if (v > maxTimeCount) {
      maxTimeCount = v;
      dominantTime = k;
    }
  });
  const timePct = total > 0 ? Math.round((maxTimeCount / total) * 100) : 0;
  
  // 3. Profondità
  let maxDepth = 0;
  let totalDepth = 0;
  bookmarks.forEach(b => {
    const depth = b.folderPath ? b.folderPath.length : 0;
    totalDepth += depth;
    if (depth > maxDepth) maxDepth = depth;
  });
  const avgDepth = total > 0 ? (totalDepth / total).toFixed(1) : '0';
  
  // 4. Parole Ricorrenti
  const wordCounts = {};
  const stopWords = new Set(['il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', 'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra', 'e', 'o', 'se', 'che', 'non', 'del', 'dello', 'della', 'dei', 'degli', 'delle', 'al', 'allo', 'alla', 'ai', 'agli', 'alle', 'dal', 'dallo', 'dalla', 'dai', 'dagli', 'dalle', 'nel', 'nello', 'nella', 'nei', 'negli', 'nelle', 'sul', 'sullo', 'sulla', 'sui', 'sugli', 'sulle', 'per', 'con', 'ma', 'come', 'anche', 'questo', 'quello', 'mia', 'mio', 'tua', 'tuo', 'sua', 'suo', 'the', 'of', 'and', 'to', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'an', 'a', 'about', 'as', 'into', 'how', 'why', 'what', 'who', 'www', 'com', 'http', 'https']);
  
  bookmarks.forEach(b => {
    if (!b.title) return;
    const clean = b.title.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, " ");
    const words = clean.split(/\s+/);
    words.forEach(w => {
      const cleanW = w.trim();
      if (cleanW.length > 3 && !stopWords.has(cleanW) && isNaN(cleanW)) {
        wordCounts[cleanW] = (wordCounts[cleanW] || 0) + 1;
      }
    });
  });
  
  const sortedWords = Object.entries(wordCounts)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
    
  // 5. Personality Profiler
  const pCounts = { developer: 0, social: 0, culture: 0, shopping: 0, entertainment: 0, news: 0 };
  let classified = 0;
  
  bookmarks.forEach(b => {
    let matched = false;
    const url = (b.url || '').toLowerCase();
    const title = (b.title || '').toLowerCase();
    
    if (url.includes('github') || url.includes('gitlab') || url.includes('stackoverflow') || url.includes('npmjs') || url.includes('dev.to') || url.includes('medium.com') || url.includes('codepen') || url.includes('typescript') || url.includes('javascript') || title.includes('code') || title.includes('api') || title.includes('css') || title.includes('html') || title.includes('programming') || title.includes('git') || title.includes('react') || title.includes('angular') || title.includes('vue') || title.includes('node') || title.includes('python')) {
      pCounts.developer++;
      matched = true;
    }
    if (url.includes('reddit.com') || url.includes('twitter.com') || url.includes('x.com') || url.includes('facebook.com') || url.includes('instagram.com') || url.includes('tiktok.com') || url.includes('linkedin.com')) {
      pCounts.social++;
      matched = true;
    }
    if (url.includes('wikipedia.org') || url.includes('nature.com') || url.includes('arxiv.org') || url.includes('edu') || url.includes('coursera') || url.includes('udemy') || url.includes('school') || url.includes('science') || url.includes('history') || title.includes('ricerca') || title.includes('scienza') || title.includes('storia') || title.includes('corso') || title.includes('studio')) {
      pCounts.culture++;
      matched = true;
    }
    if (url.includes('amazon') || url.includes('ebay') || url.includes('aliexpress') || url.includes('etsy') || url.includes('shopping') || url.includes('store') || url.includes('shop') || url.includes('wishlist')) {
      pCounts.shopping++;
      matched = true;
    }
    if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('netflix.com') || url.includes('twitch.tv') || url.includes('spotify.com') || url.includes('imdb.com') || url.includes('games') || url.includes('playstation') || url.includes('steam')) {
      pCounts.entertainment++;
      matched = true;
    }
    if (url.includes('news') || url.includes('nyt') || url.includes('cnn') || url.includes('repubblica.it') || url.includes('corriere.it') || url.includes('tgcom') || url.includes('blog')) {
      pCounts.news++;
      matched = true;
    }
    if (matched) classified++;
  });
  
  const div = classified || 1;
  const percentages = {
    developer: Math.round((pCounts.developer / div) * 100),
    social: Math.round((pCounts.social / div) * 100),
    culture: Math.round((pCounts.culture / div) * 100),
    shopping: Math.round((pCounts.shopping / div) * 100),
    entertainment: Math.round((pCounts.entertainment / div) * 100),
    news: Math.round((pCounts.news / div) * 100)
  };
  
  const sortedP = Object.entries(percentages).sort((a,b) => b[1] - a[1]);
  const dominant = sortedP[0][0];
  let archetype = '';
  let archetypeDesc = '';
  
  switch(dominant) {
    case 'developer':
      archetype = "L'Eterno Studente del Codice 💻";
      archetypeDesc = "La tua collezione è piena di repository Github, documentazione API e corsi di programmazione che prometti a te stesso di studiare 'il prossimo weekend'. Spoiler: non succederà mai, ma fa comodo averli salvati!";
      break;
    case 'social':
      archetype = "Il Doomscroller Seriale delle Comunità Online 📱";
      archetypeDesc = "Reddit, Twitter/X e altri social dominano la tua lista. Ami raccogliere thread infiniti di discussioni, meme e curiosità. Per te i preferiti sono un museo archeologico di discussioni internet.";
      break;
    case 'culture':
      archetype = "Il Filosofo del 'Lo Leggo Dopo' 🧠";
      archetypeDesc = "Wikipedia e articoli scientifici sono la tua passione. I tuoi preferiti assomigliano a una biblioteca accademica medievale. Sei affascinato dalla conoscenza, ma probabilmente hai letto solo l'indice.";
      break;
    case 'shopping':
      archetype = "L'Accumulatore Impulsivo di Wishlist 🛍️";
      archetypeDesc = "Hai decine di link ad Amazon, eBay e negozi online. I tuoi preferiti fungono da lettera a Babbo Natale virtuale permanente. Spesso salvi articoli sull'onda del momento, scordandotene il giorno dopo.";
      break;
    case 'entertainment':
      archetype = "Il Critico di Poltrona di Livello Master 🎬";
      archetypeDesc = "YouTube, Twitch, cinema e giochi. Il tuo tempo libero digitale è minuziosamente catalogato. Usi i preferiti per non perdere nessun video o film consigliato, accumulando giga di divertimento futuro.";
      break;
    case 'news':
      archetype = "L'Informato Cronico (Futuro Opinionista) 📰";
      archetypeDesc = "Giornali, notizie flash e blog di geopolitica o economia. Sei sempre sul pezzo e ami avere report dettagliati pronti alla mano per smentire qualcuno in una discussione nei commenti.";
      break;
    default:
      archetype = "Il Collezionista Caotico del Web 🌀";
      archetypeDesc = "La tua personalità web sfugge a qualsiasi classificazione standard! Il tuo archivio è un mix affascinante ed estremamente variegato di codice, notizie, acquisti e cultura generale. Un vero esploratore del web!";
      break;
  }
  
  appState.wrappedStats = {
    total,
    sortedDomains,
    hourCounts,
    dominantTime,
    timePct,
    hasHours,
    maxDepth,
    avgDepth,
    sortedWords,
    percentages,
    archetype,
    archetypeDesc
  };
}

function renderWrappedStory() {
  const container = elements.wrappedActiveSlideContainer;
  const progressContainer = elements.wrappedStoryProgress;
  const stats = appState.wrappedStats;
  const slide = appState.wrappedCurrentSlide;
  
  if (!container || !progressContainer || !stats) return;
  
  // 1. Render progress bar segments
  progressContainer.innerHTML = '';
  for (let i = 0; i < 6; i++) {
    const segment = document.createElement('div');
    segment.className = 'wrapped-progress-segment';
    if (i < slide) {
      segment.classList.add('completed');
    }
    const fill = document.createElement('div');
    fill.className = 'wrapped-progress-fill';
    if (i === slide) {
      segment.classList.add('active');
      fill.style.width = '100%';
      fill.style.transition = 'width 5s linear';
    }
    segment.appendChild(fill);
    progressContainer.appendChild(segment);
  }
  
  // 2. Render Slide content based on current index
  container.innerHTML = '';
  container.className = 'wrapped-slide-content wrapped-slide-fade';
  
  const wrapperStory = elements.exploreSecWrapped.querySelector('.wrapped-story-container');
  
  if (slide === 0) {
    wrapperStory.style.background = 'linear-gradient(135deg, #120c1f 0%, #1a0f30 100%)';
    container.innerHTML = `
      <div style="text-align: center; padding: 1rem 0;">
        <span style="font-size: 3.5rem; display: block; margin-bottom: 1.5rem; animation: bounce 2s infinite;">🔮</span>
        <h2 style="font-size: 2rem; text-transform: uppercase; margin-bottom: 1.5rem; line-height: 1.3;">Il tuo Web Personality<br><span class="gradient-text">Wrapped</span></h2>
        <p style="color: rgba(255,255,255,0.8); font-size: 1rem; line-height: 1.6; max-width: 400px; margin: 0 auto;">
          Abbiamo analizzato i tuoi <strong>${stats.total} preferiti</strong> salvati nel browser. 
          Scopriamo cosa dicono i link accumulati sulla tua vera personalità digitale...
        </p>
      </div>
    `;
  } else if (slide === 1) {
    wrapperStory.style.background = 'linear-gradient(135deg, #7F00FF 0%, #FF007F 100%)';
    
    // Costruisci il chart delle personalità
    const pRows = Object.entries(stats.percentages)
      .filter(([_, val]) => val > 0)
      .map(([key, val]) => {
        const label = key.toUpperCase();
        return `
          <div style="display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 0.25rem;">
            <span>${label}</span>
            <span>${val}%</span>
          </div>
        `;
      }).join('');
      
    container.innerHTML = `
      <div>
        <span style="font-size: 0.75rem; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.7); display: block; margin-bottom: 0.5rem; font-weight: 700;">Il tuo Archetipo Digitale</span>
        <div class="wrapped-personality-archetype">${escapeHTML(stats.archetype)}</div>
        <p style="font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem; color: rgba(255,255,255,0.9); text-align: center; font-style: italic;">
          "${escapeHTML(stats.archetypeDesc)}"
        </p>
        <div style="background: rgba(0,0,0,0.3); border-radius: 10px; padding: 1rem; border: 1px solid rgba(255,255,255,0.1);">
          <span style="font-size: 0.75rem; text-transform: uppercase; font-weight: 700; display: block; margin-bottom: 0.75rem; color: rgba(255,255,255,0.8);">Composizione Profilo:</span>
          ${pRows}
        </div>
      </div>
    `;
  } else if (slide === 2) {
    wrapperStory.style.background = 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)';
    
    let domHtml = '';
    stats.sortedDomains.forEach(dom => {
      domHtml += `
        <div class="wrapped-chart-bar-row">
          <div class="wrapped-chart-label-row">
            <span>${escapeHTML(dom.domain)}</span>
            <span>${dom.count} link (${dom.pct}%)</span>
          </div>
          <div class="wrapped-chart-bar-bg">
            <div class="wrapped-chart-bar-fill" style="width: ${dom.pct}%; background: #fff;"></div>
          </div>
        </div>
      `;
    });
    
    container.innerHTML = `
      <div>
        <span style="font-size: 0.75rem; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.7); display: block; margin-bottom: 0.5rem; font-weight: 700;">I tuoi Luoghi Frequenti</span>
        <h3 style="margin-bottom: 1.5rem; font-size: 1.6rem;">I Domini più Salvati</h3>
        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
          ${domHtml || '<p style="text-align: center; color: rgba(255,255,255,0.7);">Dati sui domini non disponibili.</p>'}
        </div>
      </div>
    `;
  } else if (slide === 3) {
    wrapperStory.style.background = 'linear-gradient(135deg, #ff9966 0%, #ff5e62 100%)';
    
    let icon = '🌅';
    let label = 'Mattiniero';
    let comment = 'Ami catalogare link bevendo il caffè mattutino. Super organizzato fin dall\'alba!';
    
    if (stats.dominantTime === 'night') {
      icon = '🦉';
      label = 'Gufo della Notte';
      comment = 'Salvi la maggior parte dei link nelle ore più tarde. Insonnia, codice notturno o sessioni di acquisti compulsivi a mezzanotte?';
    } else if (stats.dominantTime === 'afternoon') {
      icon = '⚡';
      label = 'Produttività Pomeridiana';
      comment = 'Raccogli informazioni durante le ore calde del lavoro o dello studio. Lavoratore infaticabile!';
    } else if (stats.dominantTime === 'evening') {
      icon = '🌙';
      label = 'Relax Serale';
      comment = 'Salvi link mentre ti rilassi sul divano dopo cena. I tuoi preferiti profumano di tempo libero.';
    }
    
    container.innerHTML = `
      <div style="text-align: center;">
        <span style="font-size: 3.5rem; display: block; margin-bottom: 1rem;">${icon}</span>
        <span style="font-size: 0.75rem; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.7); display: block; margin-bottom: 0.5rem; font-weight: 700;">Il tuo Ritmo di Salvataggio</span>
        <h3 style="font-size: 1.8rem; margin-bottom: 1rem;">Sei un ${label}!</h3>
        
        ${stats.hasHours ? `
          <p style="font-size: 1.1rem; font-weight: 500; margin-bottom: 1rem; color: #fff;">
            Il <strong>${stats.timePct}%</strong> dei tuoi preferiti viene salvato in questa fascia.
          </p>
          <p style="font-size: 0.95rem; line-height: 1.5; color: rgba(255,255,255,0.85); max-width: 380px; margin: 0 auto;">
            "${comment}"
          </p>
        ` : `
          <p style="font-size: 0.95rem; color: rgba(255,255,255,0.85); max-width: 380px; margin: 0 auto;">
            Gli orari di aggiunta non sono stati rilevati nel file caricato. Ti abbiamo comunque assegnato d'ufficio l'archetipo ${label} per simpatia!
          </p>
        `}
      </div>
    `;
  } else if (slide === 4) {
    wrapperStory.style.background = 'linear-gradient(135deg, #00c6ff 0%, #0072ff 100%)';
    
    let evaluation = '';
    if (stats.maxDepth >= 5) {
      evaluation = "<strong>Ingegnere dell'Archiviazione</strong>: Adori le scatole dentro le scatole. Per trovare un preferito serve una mappa speleologica. Ordine ossessivo o labirinto caotico?";
    } else if (stats.maxDepth >= 2) {
      evaluation = "<strong>Ordinato Equilibrato</strong>: Usi le cartelle con saggezza. Dividi per macro-argomenti senza impazzire in gerarchie bizantine.";
    } else {
      evaluation = "<strong>Minimalista Caotico</strong>: Cartelle? No, grazie! Metti tutto alla rinfusa nella root principale. Trovare un link è un vero atto di fede!";
    }
    
    container.innerHTML = `
      <div style="text-align: center;">
        <span style="font-size: 3.5rem; display: block; margin-bottom: 1rem;">📂</span>
        <span style="font-size: 0.75rem; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.7); display: block; margin-bottom: 0.5rem; font-weight: 700;">Struttura Cartelle</span>
        <h3 style="font-size: 1.8rem; margin-bottom: 1.5rem;">L'Ingegnere dell'Archivio</h3>
        
        <div style="display: flex; justify-content: center; gap: 2rem; margin-bottom: 1.5rem;">
          <div style="background: rgba(255,255,255,0.1); padding: 0.75rem 1.25rem; border-radius: 10px;">
            <div style="font-size: 1.75rem; font-weight: 800;">${stats.maxDepth}</div>
            <div style="font-size: 0.7rem; text-transform: uppercase; color: rgba(255,255,255,0.7);">Profondità Max</div>
          </div>
          <div style="background: rgba(255,255,255,0.1); padding: 0.75rem 1.25rem; border-radius: 10px;">
            <div style="font-size: 1.75rem; font-weight: 800;">${stats.avgDepth}</div>
            <div style="font-size: 0.7rem; text-transform: uppercase; color: rgba(255,255,255,0.7);">Profondità Media</div>
          </div>
        </div>
        
        <p style="font-size: 0.95rem; line-height: 1.5; color: rgba(255,255,255,0.9); max-width: 400px; margin: 0 auto;">
          ${evaluation}
        </p>
      </div>
    `;
  } else if (slide === 5) {
    wrapperStory.style.background = 'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)';
    
    let tagsHtml = '';
    stats.sortedWords.forEach((wordObj, index) => {
      tagsHtml += `
        <span class="wrapped-tag wrapped-tag-size-${index + 1}">${escapeHTML(wordObj.word)}</span>
      `;
    });
    
    container.innerHTML = `
      <div style="text-align: center;">
        <span style="font-size: 0.75rem; letter-spacing: 2px; text-transform: uppercase; color: rgba(255,255,255,0.7); display: block; margin-bottom: 0.5rem; font-weight: 700;">Le tue Ossessioni Tematiche</span>
        <h3 style="font-size: 1.6rem; margin-bottom: 1rem;">Parole Chiave Ricorrenti</h3>
        <p style="font-size: 0.85rem; color: rgba(255,255,255,0.7); margin-bottom: 1.5rem;">
          Questi sono i termini che appaiono più spesso nei titoli dei tuoi preferiti.
        </p>
        <div class="wrapped-tags-cloud">
          ${tagsHtml || '<p style="color: rgba(255,255,255,0.7);">Nessuna parola chiave estratta.</p>'}
        </div>
      </div>
    `;
  }
  
  // 3. Update counter text
  if (elements.wrappedSlideCounter) {
    elements.wrappedSlideCounter.textContent = `Slide ${slide + 1} di 6`;
  }
}

function navigateWrappedSlide(dir) {
  let nextSlide = appState.wrappedCurrentSlide + dir;
  if (nextSlide < 0) nextSlide = 0;
  if (nextSlide > 5) nextSlide = 5;
  
  appState.wrappedCurrentSlide = nextSlide;
  renderWrappedStory();
}

function copyWrappedReport() {
  const stats = appState.wrappedStats;
  if (!stats) return;
  
  let reportText = `📊 **Mio Bookmarks Wrapped 2026** 📊\n\n`;
  reportText += `🔮 Archetipo Digitale: *${stats.archetype}*\n`;
  reportText += `🔗 Totale Preferiti Salvati: ${stats.total}\n\n`;
  
  reportText += `🏆 Top 3 Domini di Riferimento:\n`;
  stats.sortedDomains.slice(0, 3).forEach((dom, i) => {
    reportText += `  ${i+1}. ${dom.domain} (${dom.pct}%)\n`;
  });
  reportText += `\n`;
  
  if (stats.hasHours) {
    let rhythm = 'Mattiniero 🌅';
    if (stats.dominantTime === 'night') rhythm = 'Gufo della Notte 🦉';
    else if (stats.dominantTime === 'afternoon') rhythm = 'Produttività Pomeridiana ⚡';
    else if (stats.dominantTime === 'evening') rhythm = 'Relax Serale 🌙';
    reportText += `⏱️ Ritmo di Salvataggio: *${rhythm}* (${stats.timePct}% dei link)\n`;
  }
  
  reportText += `📁 Livelli di Cartelle Max: ${stats.maxDepth}\n`;
  
  if (stats.sortedWords.length > 0) {
    reportText += `🏷️ Parole Chiave Ossessione: ${stats.sortedWords.map(w => w.word).join(', ')}\n`;
  }
  
  reportText += `\nScopri la tua personalità con Bookmarks Tools! 🚀`;
  
  navigator.clipboard.writeText(reportText).then(() => {
    showToast("Report copiato negli appunti! Condividilo con i tuoi amici.");
  }).catch(err => {
    console.error("Impossibile copiare il report:", err);
  });
}

function getDomainFromUrl(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace('www.', '');
  } catch (e) {
    return url;
  }
}
