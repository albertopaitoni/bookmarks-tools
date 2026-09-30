import { escapeCSV, escapeMarkdown, markdownLink } from './export-utils.js';

/**
 * comparator.js
 * Algoritmo di confronto per due file di preferiti HTML (versione precedente e successiva).
 */

/**
 * Confronta due liste piatte di preferiti (File A = Vecchio, File B = Nuovo)
 * e restituisce le differenze strutturate.
 * @param {Array} flatA - Lista piatta dei preferiti del File A.
 * @param {Array} flatB - Lista piatta dei preferiti del File B.
 * @returns {Object} Oggetto con le categorie: added, removed, modified, identical.
 */
export function compareBookmarks(flatA, flatB) {
  const listA = flatA;
  const listB = flatB;

  const added = [];
  const removed = [];
  const modified = [];
  const identical = [];

  // Set per tenere traccia degli elementi già matchati
  const matchedA = new Set();
  const matchedB = new Set();

  // Code di indici: ogni occorrenza viene consumata una sola volta per stadio.
  // Serializzare il percorso evita collisioni tra ['A / B'] e ['A', 'B'].
  const exactKey = b => JSON.stringify([b.url, b.folderPath, b.title]);
  const folderKey = b => JSON.stringify([b.url, b.folderPath]);
  function buildIndex(keyFor) {
    const index = new Map();
    listA.forEach((bookmark, i) => {
      const key = keyFor(bookmark);
      if (!index.has(key)) index.set(key, { indices: [], cursor: 0 });
      index.get(key).indices.push(i);
    });
    return index;
  }
  const exactIndex = buildIndex(exactKey);
  const folderIndex = buildIndex(folderKey);
  const urlIndex = buildIndex(b => b.url);
  function takeMatch(index, key) {
    const queue = index.get(key);
    if (!queue) return -1;
    while (queue.cursor < queue.indices.length) {
      const i = queue.indices[queue.cursor++];
      if (!matchedA.has(i)) return i;
    }
    return -1;
  }

  // STADIO 1: Ricerca di match IDENTICI esatti (stesso URL, stesso folderPath, stesso titolo)
  for (let i = 0; i < listB.length; i++) {
    const b = listB[i];
    const matchIdx = takeMatch(exactIndex, exactKey(b));

    if (matchIdx !== -1) {
      identical.push({
        status: 'identical',
        url: b.url,
        title: b.title,
        folderPath: b.folderPath,
        addDate: b.addDate,
        icon: b.icon
      });
      matchedA.add(matchIdx);
      matchedB.add(i);
    }
  }

  // STADIO 2: Ricerca di match per lo stesso URL nella STESSA CARTELLA (ma con Titolo cambiato)
  for (let i = 0; i < listB.length; i++) {
    if (matchedB.has(i)) continue;
    const b = listB[i];
    const matchIdx = takeMatch(folderIndex, folderKey(b));

    if (matchIdx !== -1) {
      const a = listA[matchIdx];
      modified.push({
        status: 'modified',
        url: b.url,
        oldTitle: a.title,
        newTitle: b.title,
        oldFolderPath: a.folderPath,
        newFolderPath: b.folderPath,
        addDate: b.addDate,
        icon: b.icon,
        titleChanged: true,
        folderChanged: false
      });
      matchedA.add(matchIdx);
      matchedB.add(i);
    }
  }

  // STADIO 3: Ricerca di match per lo stesso URL (con cartella e/o titolo cambiati)
  for (let i = 0; i < listB.length; i++) {
    if (matchedB.has(i)) continue;
    const b = listB[i];

    const matchIdx = takeMatch(urlIndex, b.url);

    if (matchIdx !== -1) {
      const a = listA[matchIdx];
      const titleChanged = a.title !== b.title;
      const folderChanged = JSON.stringify(a.folderPath) !== JSON.stringify(b.folderPath);

      modified.push({
        status: 'modified',
        url: b.url,
        oldTitle: a.title,
        newTitle: b.title,
        oldFolderPath: a.folderPath,
        newFolderPath: b.folderPath,
        addDate: b.addDate,
        icon: b.icon,
        titleChanged,
        folderChanged
      });
      matchedA.add(matchIdx);
      matchedB.add(i);
    }
  }

  // STADIO 4: Gli elementi rimanenti in B sono "Aggiunti"
  for (let i = 0; i < listB.length; i++) {
    if (matchedB.has(i)) continue;
    const b = listB[i];
    added.push({
      status: 'added',
      url: b.url,
      title: b.title,
      folderPath: b.folderPath,
      addDate: b.addDate,
      icon: b.icon
    });
  }

  // STADIO 5: Gli elementi rimanenti in A sono "Rimossi"
  for (let i = 0; i < listA.length; i++) {
    if (matchedA.has(i)) continue;
    const a = listA[i];
    removed.push({
      status: 'removed',
      url: a.url,
      title: a.title,
      folderPath: a.folderPath,
      addDate: a.addDate,
      icon: a.icon
    });
  }

  return {
    added,
    removed,
    modified,
    identical
  };
}

/**
 * Genera il contenuto CSV per il report di confronto.
 */
export function generateCompareCSV(results) {
  const headers = ['Indice', 'Stato', 'Titolo Precedente', 'Nuovo Titolo', 'Percorso Precedente', 'Nuovo Percorso', 'URL Link', 'Data Aggiunta'];
  const allRows = [];
  let index = 1;

  // Aggiunti
  results.added.forEach(b => {
    allRows.push([
      (index++).toString(),
      'Aggiunto',
      '',
      b.title,
      '',
      b.folderPath.join(' / '),
      b.url,
      b.addDate || ''
    ]);
  });

  // Rimossi
  results.removed.forEach(b => {
    allRows.push([
      (index++).toString(),
      'Rimosso',
      b.title,
      '',
      b.folderPath.join(' / '),
      '',
      b.url,
      b.addDate || ''
    ]);
  });

  // Modificati
  results.modified.forEach(b => {
    allRows.push([
      (index++).toString(),
      'Modificato',
      b.oldTitle,
      b.newTitle,
      b.oldFolderPath.join(' / '),
      b.newFolderPath.join(' / '),
      b.url,
      b.addDate || ''
    ]);
  });

  // Identici
  results.identical.forEach(b => {
    allRows.push([
      (index++).toString(),
      'Identico',
      b.title,
      b.title,
      b.folderPath.join(' / '),
      b.folderPath.join(' / '),
      b.url,
      b.addDate || ''
    ]);
  });

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...allRows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');

  return csvContent;
}

/**
 * Genera il contenuto Markdown per il report di confronto.
 */
export function generateCompareMarkdown(results) {
  let md = '# Report Confronto Preferiti\n\n';
  
  // Riepilogo Statistiche
  md += `## Riepilogo Statistiche\n`;
  md += `- **Aggiunti:** ${results.added.length}\n`;
  md += `- **Rimossi:** ${results.removed.length}\n`;
  md += `- **Modificati:** ${results.modified.length}\n`;
  md += `- **Identici:** ${results.identical.length}\n\n`;

  // Aggiunti
  md += `## Preferiti Aggiunti (${results.added.length})\n`;
  if (results.added.length === 0) {
    md += '*Nessun preferito aggiunto.*\n\n';
  } else {
    results.added.forEach(b => {
      const folderStr = b.folderPath.length > 0 ? ` [${escapeMarkdown(b.folderPath.join(' / '))}]` : '';
      md += `- ${markdownLink(b.title, b.url)}${folderStr}\n`;
    });
    md += '\n';
  }

  // Rimossi
  md += `## Preferiti Rimossi (${results.removed.length})\n`;
  if (results.removed.length === 0) {
    md += '*Nessun preferito rimosso.*\n\n';
  } else {
    results.removed.forEach(b => {
      const folderStr = b.folderPath.length > 0 ? ` [${escapeMarkdown(b.folderPath.join(' / '))}]` : '';
      md += `- ~~${markdownLink(b.title, b.url)}~~${folderStr}\n`;
    });
    md += '\n';
  }

  // Modificati
  md += `## Preferiti Modificati (${results.modified.length})\n`;
  if (results.modified.length === 0) {
    md += '*Nessun preferito modificato.*\n\n';
  } else {
    results.modified.forEach(b => {
      md += `- ${markdownLink('Link', b.url)}\n`;
      if (b.titleChanged) {
        md += `  - **Titolo:** "${escapeMarkdown(b.oldTitle)}" &rarr; "${escapeMarkdown(b.newTitle)}"\n`;
      }
      if (b.folderChanged) {
        const oldP = b.oldFolderPath.length > 0 ? b.oldFolderPath.join(' / ') : 'Radice';
        const newP = b.newFolderPath.length > 0 ? b.newFolderPath.join(' / ') : 'Radice';
        md += `  - **Cartella:** [${escapeMarkdown(oldP)}] &rarr; [${escapeMarkdown(newP)}]\n`;
      }
    });
    md += '\n';
  }

  // Identici
  md += `## Preferiti Identici (${results.identical.length})\n`;
  if (results.identical.length === 0) {
    md += '*Nessun preferito identico.*\n\n';
  } else {
    results.identical.forEach(b => {
      const folderStr = b.folderPath.length > 0 ? ` [${escapeMarkdown(b.folderPath.join(' / '))}]` : '';
      md += `- ${markdownLink(b.title, b.url)}${folderStr}\n`;
    });
    md += '\n';
  }

  return md.trim();
}
