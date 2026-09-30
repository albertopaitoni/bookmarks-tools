/**
 * visualization.js
 * Modulo dedicato alla gestione delle visualizzazioni grafiche (Mappa Mentale / Grafo e Sunburst Chart)
 * Utilizza D3.js caricato globalmente dal browser.
 */

import { openBookmarkUrl } from './urls.js';

let forceSimulation = null;
let currentZoom = null;
let currentSvg = null;

/**
 * Renderizza il grafico interattivo corretto in base alle opzioni fornite.
 * @param {string} containerId - ID del container HTML.
 * @param {Array|Object} data - I dati strutturati ad albero dei preferiti.
 * @param {Object} options - Opzioni di rendering (graphType, showLinks, activeFolderFilter, ecc.).
 * @param {Function} onFolderSelected - Callback invocata alla selezione di una cartella.
 */
export function renderVisualGraph(containerId, data, options, onFolderSelected) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Svuota il container
  container.innerHTML = '';
  
  // Arresta simulazioni precedenti se attive
  if (forceSimulation) {
    forceSimulation.stop();
    forceSimulation = null;
  }
  currentSvg = null;
  currentZoom = null;

  if (!data || (Array.isArray(data) && data.length === 0)) {
    container.innerHTML = `<div class="empty-state-message" style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--text-secondary); padding: 2rem; text-align: center;">
      Nessun dato caricato per la visualizzazione grafica. Carica un file HTML dei preferiti o premi "Carica file Esempio".
    </div>`;
    return;
  }

  // Costruisci una radice fittizia se il dato è un array
  let treeRoot;
  if (Array.isArray(data)) {
    treeRoot = {
      title: options.rootTitle || "I miei Preferiti",
      type: "folder",
      folderPath: [],
      children: data
    };
  } else {
    treeRoot = data;
  }

  // Filtra i preferiti (bookmark) se showLinks è disattivato
  const filteredTree = filterTreeNodes(treeRoot, options.showLinks);

  if (options.graphType === 'sunburst') {
    drawSunburstChart(container, filteredTree, options, onFolderSelected);
  } else {
    drawForceGraph(container, filteredTree, options, onFolderSelected);
  }
}

/**
 * Filtra ricorsivamente i nodi dell'albero clonando la struttura
 */
function filterTreeNodes(node, showLinks) {
  const cloned = { ...node };
  if (cloned.children) {
    cloned.children = cloned.children
      .filter(child => showLinks || child.type === 'folder')
      .map(child => filterTreeNodes(child, showLinks));
  }
  return cloned;
}

/**
 * 1. GRAFO A NODI / MAPPA MENTALE (FORCE-DIRECTED GRAPH)
 */
function drawForceGraph(container, treeData, options, onFolderSelected) {
  const width = container.clientWidth || 800;
  const height = 550;

  const svg = d3.select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height]);

  currentSvg = svg;

  const g = svg.append("g");

  // Configura lo Zoom e il Pan
  const zoom = d3.zoom()
    .scaleExtent([0.15, 3])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    });

  svg.call(zoom);
  currentZoom = zoom;

  // Inizializza la gerarchia D3
  const d3Root = d3.hierarchy(treeData, d => d.children);

  // Collassa i nodi più profondi del livello 1 per impostazione predefinita per evitare affollamento
  d3Root.descendants().forEach(d => {
    if (d.depth >= 1 && d.data.type === 'folder' && d.children) {
      d._children = d.children;
      d.children = null;
    }
  });

  // Crea la simulazione delle forze
  const simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(d => d.id).distance(d => d.target.data.type === 'folder' ? 60 : 40).strength(0.8))
    .force("charge", d3.forceManyBody().strength(-150))
    .force("x", d3.forceX(width / 2).strength(0.08))
    .force("y", d3.forceY(height / 2).strength(0.08))
    .force("collision", d3.forceCollide().radius(d => d.data.type === 'folder' ? 18 : 8));

  forceSimulation = simulation;

  // Funzione di aggiornamento grafico del grafo
  function update() {
    // Assegna ID univoci
    let i = 0;
    d3Root.each(d => { d.id = d.id || ++i; });

    const nodes = d3Root.descendants();
    const links = d3Root.links();

    // 1. Vincola i collegamenti
    const link = g.selectAll(".graph-link")
      .data(links, d => d.target.id);

    // Rimuovi vecchi collegamenti
    link.exit().remove();

    // Crea nuovi collegamenti
    const linkEnter = link.enter()
      .append("line")
      .attr("class", "graph-link");

    // Unisci
    const linkMerge = linkEnter.merge(link);

    // 2. Vincola i nodi
    const node = g.selectAll(".graph-node")
      .data(nodes, d => d.id);

    // Rimuovi vecchi nodi
    node.exit().remove();

    // Crea nuovi nodi
    const nodeEnter = node.enter()
      .append("g")
      .attr("class", d => `graph-node graph-node--${d.data.type}`)
      .call(drag(simulation));

    // Aggiungi il cerchio del nodo
    nodeEnter.append("circle")
      .attr("r", d => d.data.type === 'folder' ? 9 : 4.5);

    // Aggiungi l'etichetta di testo
    nodeEnter.append("text")
      .attr("class", "graph-node-label")
      .attr("dy", "0.31em")
      .attr("x", d => d.data.type === 'folder' ? 13 : 8)
      .attr("text-anchor", "start")
      .text(d => truncateText(d.data.title, 22));

    // Unisci
    const nodeMerge = nodeEnter.merge(node);

    // Aggiorna lo stato visivo delle cartelle (collassate vs espanse)
    nodeMerge.classed("collapsed", d => d.data.type === 'folder' && !d.children && d._children);

    // Gestisci eventi del mouse
    nodeMerge
      .on("click", (event, d) => {
        event.stopPropagation();
        if (d.data.type === 'folder') {
          // Singolo click: espandi/comprimi cartella
          toggleNodeCollapse(d);
          update();
        }
      })
      .on("dblclick", (event, d) => {
        event.stopPropagation();
        if (d.data.type === 'bookmark' && d.data.url) {
          openBookmarkUrl(d.data.url);
        } else if (d.data.type === 'folder') {
          // Doppio click: filtra la tabella/dashboard per questa cartella
          if (onFolderSelected) {
            onFolderSelected(d.data.folderPath.concat(d.data.title));
          }
        }
      })
      .on("mouseover", (event, d) => {
        showTooltip(event, d);
        // Evidenzia collegamenti adiacenti
        linkMerge.classed("highlighted", l => l.source.id === d.id || l.target.id === d.id);
      })
      .on("mouseout", () => {
        hideTooltip();
        linkMerge.classed("highlighted", false);
      });

    // Aggiorna la simulazione dei nodi
    simulation.nodes(nodes);
    simulation.force("link").links(links);
    simulation.alpha(0.5).restart();

    // Ticker di simulazione fisica
    simulation.on("tick", () => {
      linkMerge
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      nodeMerge
        .attr("transform", d => `translate(${d.x},${d.y})`);
    });
  }

  // Esegui il primo disegno
  update();
  
  // Centra il grafo all'avvio
  setTimeout(() => {
    resetZoom(width, height);
  }, 300);
}

/**
 * Espande o comprime un nodo della gerarchia
 */
function toggleNodeCollapse(d) {
  if (d.children) {
    d._children = d.children;
    d.children = null;
  } else {
    d.children = d._children;
    d._children = null;
  }
}

/**
 * Gestione Drag-and-Drop per D3 Force Graph
 */
function drag(simulation) {
  function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
  }

  function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  return d3.drag()
    .on("start", dragstarted)
    .on("drag", dragged)
    .on("end", dragended);
}

/**
 * 2. GRAFICO SUNBURST (CONCENTRIC EXPLORABLE RING)
 */
function drawSunburstChart(container, treeData, options, onFolderSelected) {
  const width = container.clientWidth || 800;
  const height = 550;
  const radius = Math.min(width, height) / 2;

  // Crea elemento SVG
  const svg = d3.select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-width / 2, -height / 2, width, height]);

  currentSvg = svg;

  const g = svg.append("g");

  // Inizializza gerarchia
  const root = d3.hierarchy(treeData, d => d.children)
    // Assegna il valore di peso a ciascun nodo: i preferiti contano 1, le cartelle vuote hanno un valore minimo per essere cliccabili
    .sum(d => d.type === 'bookmark' ? 1 : 0.05)
    .sort((a, b) => b.value - a.value);

  // Crea la partizione D3
  // size rappresenta [angolo in radianti, raggio a partizione fissa]
  d3.partition()
    .size([2 * Math.PI, root.height + 1])(root);

  // Generatore di archi per D3
  const arc = d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .innerRadius(d => d.y0 * radius / (root.height + 1))
    .outerRadius(d => d.y1 * radius / (root.height + 1) - 1);

  // Schema Colori HSL per le cartelle
  const colorScale = d3.scaleRainbow();

  // Memorizza la radice corrente della vista (per gestire lo zoom)
  let currentRoot = root;

  // Disegna le fette del grafico
  const path = g.selectAll("path")
    .data(root.descendants().filter(d => d.depth > 0)) // esclude il nodo radice reale dal cerchio esterno
    .enter()
    .append("path")
    .attr("class", "sunburst-slice")
    .attr("d", arc)
    .attr("fill", d => {
      // Colora in base al primo antenato
      if (d.data.type === 'bookmark') return "var(--accent-blue)";
      let node = d;
      while (node.depth > 1) node = node.parent;
      return d3.hsl(colorScale((node.data.title.charCodeAt(0) % 20) / 20))
        .brighter(d.depth * 0.25)
        .toString();
    })
    .attr("fill-opacity", d => d.data.type === 'bookmark' ? 0.45 : 0.8)
    .on("mouseover", (event, d) => {
      showTooltip(event, d);
    })
    .on("mouseout", () => {
      hideTooltip();
    })
    .on("click", (event, d) => {
      event.stopPropagation();
      if (d.data.type === 'folder') {
        // Zoom in sulla cartella cliccata
        zoomTo(d);
      } else if (d.data.type === 'bookmark' && d.data.url) {
        openBookmarkUrl(d.data.url);
      }
    })
    .on("dblclick", (event, d) => {
      event.stopPropagation();
      if (d.data.type === 'folder' && onFolderSelected) {
        onFolderSelected(d.data.folderPath.concat(d.data.title));
      }
    });

  // Aggiungi un pulsante al centro per navigare all'indietro
  const centerCircle = g.append("circle")
    .attr("class", "sunburst-center")
    .attr("r", radius / (root.height + 1) - 2)
    .on("click", (event) => {
      event.stopPropagation();
      if (currentRoot.parent) {
        zoomTo(currentRoot.parent);
      }
    });

  // Testo nel cerchio centrale
  const centerText = g.append("text")
    .attr("class", "sunburst-center-text")
    .attr("dy", "-0.2em")
    .text("Radice");

  const centerSubtext = g.append("text")
    .attr("class", "sunburst-center-subtext")
    .attr("dy", "1.1em")
    .text("Clicca per salire");

  // Aggiorna lo stato del cerchio centrale
  updateCenterText();

  /**
   * Esegue lo zoom della partizione sunburst su un nodo specifico
   */
  function zoomTo(p) {
    currentRoot = p;
    
    // Ricalcola gli angoli e i raggi di destinazione
    root.each(d => d.target = {
      x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
      x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
      y0: Math.max(0, d.y0 - p.depth),
      y1: Math.max(0, d.y1 - p.depth)
    });

    const t = g.transition().duration(750);

    // Esegue la transizione degli archi
    path.transition(t)
      .tween("data", d => {
        const i = d3.interpolate(d.current || d, d.target);
        return t => d.current = i(t);
      })
      .attrTween("d", d => () => arc(d.current))
      .style("opacity", d => {
        // Nascondi gli archi che non sono discendenti della nuova radice di visualizzazione
        return isDescendant(p, d) ? (d.data.type === 'bookmark' ? 0.45 : 0.8) : 0;
      })
      .style("pointer-events", d => isDescendant(p, d) ? "auto" : "none");

    updateCenterText();
  }

  function isDescendant(parent, child) {
    if (parent === child) return true;
    let node = child;
    while (node.parent) {
      if (node.parent === parent) return true;
      node = node.parent;
    }
    return false;
  }

  function updateCenterText() {
    const isAtRoot = currentRoot === root;
    centerText.text(isAtRoot ? truncateText(treeData.title, 12) : "Indietro");
    centerSubtext.text(isAtRoot ? `${root.value.toFixed(0)} elementi` : truncateText(currentRoot.data.title, 14));
    centerCircle.style("cursor", isAtRoot ? "default" : "pointer");
  }
}

/**
 * 3. STRUMENTI DI SUPPORTO E UTILITY GENERALI
 */

/**
 * Mostra il tooltip personalizzato
 */
function showTooltip(event, d) {
  const tooltip = document.getElementById("graph-tooltip");
  if (!tooltip) return;

  tooltip.classList.remove("hidden");
  
  const title = d.data.title || "Senza Titolo";
  const type = d.data.type === 'folder' ? 'Cartella' : 'Preferito';
  
  let html = `<h4>${escapeHTML(title)}</h4>`;
  
  if (d.data.type === 'folder') {
    const directCount = d.data.children ? d.data.children.filter(c => c.type === 'bookmark').length : 0;
    const totalCount = countDescendantBookmarks(d.data);
    html += `
      <div class="tooltip-meta">
        <svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2v11z"/></svg>
        <strong>${type}</strong>
      </div>
      <div>Contenuto: <strong>${directCount}</strong> link diretti</div>
      <div>Totale nidificati: <strong>${totalCount}</strong> preferiti</div>
    `;
  } else {
    const domain = getDomainName(d.data.url);
    const dateFormatted = d.data.addDate ? new Date(d.data.addDate).toLocaleDateString('it-IT') : 'Non specificata';
    html += `
      <div class="tooltip-meta">
        <svg class="icon-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/></svg>
        <strong>${type}</strong>
      </div>
      <div>Dominio: <strong>${escapeHTML(domain)}</strong></div>
      <div>Aggiunto il: <strong>${dateFormatted}</strong></div>
      <div class="tooltip-url">${escapeHTML(d.data.url)}</div>
    `;
  }

  tooltip.innerHTML = html;

  // Ottieni le dimensioni del container wrapper per posizionare relativamente il tooltip
  const canvasWrapper = tooltip.parentElement;
  const wrapperRect = canvasWrapper.getBoundingClientRect();

  // Posiziona il tooltip vicino al cursore del mouse, ma dentro i limiti del wrapper
  const x = event.clientX - wrapperRect.left + 15;
  const y = event.clientY - wrapperRect.top + 15;

  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

/**
 * Nasconde il tooltip
 */
function hideTooltip() {
  const tooltip = document.getElementById("graph-tooltip");
  if (tooltip) {
    tooltip.classList.add("hidden");
  }
}

/**
 * Conta in modo ricorsivo il numero di preferiti nidificati in una cartella
 */
function countDescendantBookmarks(nodeData) {
  let count = 0;
  if (nodeData.type === 'bookmark') return 1;
  if (nodeData.children) {
    nodeData.children.forEach(child => {
      count += countDescendantBookmarks(child);
    });
  }
  return count;
}

/**
 * Estrae il nome del dominio pulito da un URL
 */
function getDomainName(urlStr) {
  try {
    if (!urlStr) return '';
    if (urlStr.startsWith('chrome://') || urlStr.startsWith('about:') || urlStr.startsWith('file:')) {
      return urlStr.split('/')[0] || urlStr;
    }
    const url = new URL(urlStr);
    return url.hostname.replace('www.', '');
  } catch (e) {
    return 'Altro';
  }
}

/**
 * Troncamento testi lunghi per l'etichettatura nel grafico
 */
function truncateText(str, maxLength) {
  if (!str) return '';
  return str.length > maxLength ? str.substring(0, maxLength - 3) + '...' : str;
}

/**
 * Escape HTML per evitare vulnerabilità XSS nel tooltip
 */
function escapeHTML(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Ripristina lo Zoom allo stato iniziale (Centrato)
 */
export function resetZoom(width = 800, height = 550) {
  if (currentSvg && currentZoom) {
    currentSvg.transition()
      .duration(750)
      .call(currentZoom.transform, d3.zoomIdentity.translate(0, 0).scale(1));
  }
}
