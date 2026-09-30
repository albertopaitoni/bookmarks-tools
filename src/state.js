// Stato condiviso dai controller della UI; non contiene riferimenti DOM.
export const appState = {
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

