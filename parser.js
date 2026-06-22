/**
 * parser.js
 * Algoritmo di parsing per preferiti HTML in formato Netscape.
 */

/**
 * Parsifica il codice HTML dei preferiti e restituisce una struttura ad albero.
 * @param {string} htmlContent - Contenuto testuale del file preferiti.
 * @returns {Array} Albero gerarchico dei preferiti e delle cartelle.
 */
export function parseBookmarks(htmlContent) {
  if (!htmlContent) return [];

  let json = null;
  if (typeof htmlContent === 'object') {
    json = htmlContent;
  } else if (typeof htmlContent === 'string') {
    const trimmed = htmlContent.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        json = JSON.parse(trimmed);
      } catch (e) {
        console.error('Failed to parse bookmarks JSON content:', e);
      }
    }
  }

  if (json) {
    if (json.roots) {
      return parseChromeBookmarks(json);
    } else if (json.children || json.guid || json.root === 'placesRoot') {
      return parseFirefoxBookmarks(json);
    } else {
      throw new Error('Formato JSON non riconosciuto. Assicurati che sia un file Bookmarks di Chrome o un backup JSON di Firefox.');
    }
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');
  const rootDL = doc.querySelector('dl') || doc.querySelector('DL') || doc.body;

  function traverseDL(dl, folderPath = []) {
    const list = [];
    if (!dl) return list;
    
    const children = Array.from(dl.children);
    
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const tagName = child.tagName.toUpperCase();
      
      if (tagName === 'DT') {
        const a = child.querySelector(':scope > a') || child.querySelector(':scope > A');
        const h3 = child.querySelector(':scope > h3') || child.querySelector(':scope > H3');
        
        if (a) {
          const url = a.getAttribute('href') || '';
          const addDateVal = a.getAttribute('add_date') || a.getAttribute('ADD_DATE') || '';
          const icon = a.getAttribute('icon') || a.getAttribute('ICON') || '';
          const title = a.textContent.trim();
          
          let addDate = '';
          if (addDateVal) {
            const timestamp = parseInt(addDateVal) * 1000;
            if (!isNaN(timestamp)) {
              addDate = new Date(timestamp).toISOString();
            }
          }
          
          list.push({
            type: 'bookmark',
            title: title || url, // Fallback se il titolo è vuoto
            url,
            addDate,
            icon,
            folderPath: [...folderPath]
          });
        } else if (h3) {
          // Trovata intestazione cartella. Cerchiamo il relativo DL contenitore.
          let subDL = child.querySelector(':scope > dl') || child.querySelector(':scope > DL');
          if (!subDL) {
            // Se non è dentro al DT, cerchiamo il fratello DL successivo
            for (let j = i + 1; j < children.length; j++) {
              const sibling = children[j];
              const siblingTag = sibling.tagName.toUpperCase();
              if (siblingTag === 'DL') {
                subDL = sibling;
                i = j; // Salta il DL nel ciclo principale per non analizzarlo due volte
                break;
              } else if (siblingTag === 'DT') {
                break; // Un altro DT significa che questa cartella non ha DL associati (vuota)
              }
            }
          }
          
          const folderName = h3.textContent.trim();
          const nextPath = [...folderPath, folderName];
          const subItems = subDL ? traverseDL(subDL, nextPath) : [];
          
          list.push({
            type: 'folder',
            title: folderName,
            folderPath: folderPath,
            children: subItems
          });
        }
      } else if (tagName === 'DL') {
        // Se un DL si trova a livello radice senza DT contenitore, analizziamo i suoi figli
        const subItems = traverseDL(child, folderPath);
        list.push(...subItems);
      }
    }
    return list;
  }
  
  return traverseDL(rootDL, []);
}

/**
 * Decomprime il formato proprietario di Firefox .jsonlz4.
 * @param {Uint8Array} uint8 - Buffer binario del file.
 * @returns {string} Stringa JSON decodificata.
 */
export function decompressMozLz4(uint8) {
  // 1. Verifica header: mozLz40\0 (8 byte)
  const magic = [109, 111, 122, 76, 122, 52, 48, 0]; // "mozLz40\0"
  for (let i = 0; i < 8; i++) {
    if (uint8[i] !== magic[i]) {
      throw new Error("Header non valido per il backup Firefox. Atteso 'mozLz40\\0'.");
    }
  }

  // 2. Legge la dimensione scompattata (4 byte little-endian, a partire dall'offset 8)
  const uncompressedSize = uint8[8] | (uint8[9] << 8) | (uint8[10] << 16) | (uint8[11] << 24);

  // 3. Decompressione LZ4 block payload a partire dall'offset 12
  const dest = new Uint8Array(uncompressedSize);
  let i = 12;
  let o = 0;

  while (i < uint8.length && o < uncompressedSize) {
    const token = uint8[i++];
    let literalLen = token >> 4;
    if (literalLen === 15) {
      while (uint8[i] === 255) {
        literalLen += 255;
        i++;
      }
      literalLen += uint8[i++];
    }

    // Copia i letterali
    for (let j = 0; j < literalLen; j++) {
      if (i < uint8.length && o < uncompressedSize) {
        dest[o++] = uint8[i++];
      }
    }

    if (i >= uint8.length || o >= uncompressedSize) {
      break;
    }

    // Legge l'offset della corrispondenza (2 byte little-endian)
    const offset = uint8[i] | (uint8[i + 1] << 8);
    i += 2;

    // Lunghezza corrispondenza (match length)
    let matchLen = token & 0x0f;
    if (matchLen === 15) {
      while (uint8[i] === 255) {
        matchLen += 255;
        i++;
      }
      matchLen += uint8[i++];
    }
    matchLen += 4; // Lunghezza minima per corrispondenza LZ4

    let ref = o - offset;
    if (ref < 0) {
      throw new Error("Errore durante la decompressione LZ4: offset fuori limite.");
    }

    // Copia la corrispondenza (può sovrapporsi, quindi va fatto byte per byte in ordine)
    for (let j = 0; j < matchLen; j++) {
      if (o < uncompressedSize) {
        dest[o++] = dest[ref++];
      }
    }
  }

  // Converte dest in stringa UTF-8
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(dest);
}

/**
 * Parsifica i preferiti in formato JSON di Chrome.
 * @param {Object} json - Oggetto JSON dei preferiti Chrome.
 * @returns {Array} Albero gerarchico standard dei preferiti.
 */
export function parseChromeBookmarks(json) {
  const tree = [];
  if (json && json.roots && typeof json.roots === 'object') {
    // Esplora i tre rami principali standard di Chrome
    const keys = ['bookmark_bar', 'other', 'synced'];
    for (const key of keys) {
      const rootNode = json.roots[key];
      if (rootNode) {
        const mapped = mapChromeNode(rootNode, []);
        if (mapped) {
          // Se la cartella radice ha figli, aggiungiamo i suoi figli direttamente al livello radice
          // per evitare una cartella inutile
          if (mapped.children && mapped.children.length > 0) {
            tree.push(...mapped.children);
          } else if (mapped.type === 'bookmark') {
            tree.push(mapped);
          }
        }
      }
    }
  }
  return tree;
}

function mapChromeNode(node, folderPath = []) {
  if (node.type === 'url') {
    let addDate = '';
    if (node.date_added) {
      const chromeTs = parseInt(node.date_added);
      if (!isNaN(chromeTs) && chromeTs > 0) {
        // Timestamp Chrome: microsecondi dal 1° gennaio 1601
        const unixTsMs = Math.floor((chromeTs - 11644473600000000) / 1000);
        if (unixTsMs > 0) {
          addDate = new Date(unixTsMs).toISOString();
        }
      }
    }
    return {
      type: 'bookmark',
      title: node.name || node.url || '',
      url: node.url || '',
      addDate: addDate,
      icon: '',
      folderPath: [...folderPath]
    };
  } else if (node.type === 'folder') {
    const nextPath = [...folderPath, node.name || ''];
    const children = [];
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        const mapped = mapChromeNode(child, nextPath);
        if (mapped) {
          children.push(mapped);
        }
      }
    }
    return {
      type: 'folder',
      title: node.name || '',
      folderPath: [...folderPath],
      children: children
    };
  }
  return null;
}

/**
 * Parsifica i preferiti in formato JSON di Firefox.
 * @param {Object} json - Oggetto JSON dei preferiti Firefox.
 * @returns {Array} Albero gerarchico standard dei preferiti.
 */
export function parseFirefoxBookmarks(json) {
  const tree = [];
  if (json && typeof json === 'object') {
    const children = json.children || (json.root === 'placesRoot' ? [] : null);
    
    if (Array.isArray(children)) {
      for (const child of children) {
        const mapped = mapFirefoxNode(child, []);
        if (mapped) {
          const systemFolders = ['bookmarksMenuFolder', 'toolbarFolder', 'unfiledBookmarksFolder', 'mobileBookmarksFolder'];
          const isSystemFolder = systemFolders.includes(child.root) || 
                                 child.root === 'menu' || 
                                 child.root === 'toolbar' || 
                                 child.root === 'unfiled';
          
          if (isSystemFolder && mapped.children && mapped.children.length > 0) {
            tree.push(...mapped.children);
          } else {
            tree.push(mapped);
          }
        }
      }
    } else {
      const mapped = mapFirefoxNode(json, []);
      if (mapped) {
        if (mapped.type === 'folder' && mapped.children) {
          tree.push(...mapped.children);
        } else {
          tree.push(mapped);
        }
      }
    }
  }
  return tree;
}

function mapFirefoxNode(node, folderPath = []) {
  const isBookmark = node.typeCode === 1 || node.type === 'text/x-moz-place';
  const isFolder = node.typeCode === 2 || node.type === 'text/x-moz-place-container';

  if (isBookmark) {
    let addDate = '';
    if (node.dateAdded) {
      const firefoxTs = Math.floor(node.dateAdded / 1000);
      if (!isNaN(firefoxTs) && firefoxTs > 0) {
        addDate = new Date(firefoxTs).toISOString();
      }
    }
    return {
      type: 'bookmark',
      title: node.title || node.uri || '',
      url: node.uri || '',
      addDate: addDate,
      icon: '',
      folderPath: [...folderPath]
    };
  } else if (isFolder) {
    const nextPath = [...folderPath, node.title || ''];
    const children = [];
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        const mapped = mapFirefoxNode(child, nextPath);
        if (mapped) {
          children.push(mapped);
        }
      }
    }
    return {
      type: 'folder',
      title: node.title || '',
      folderPath: [...folderPath],
      children: children
    };
  }
  return null;
}

/**
 * Appiattisce l'albero gerarchico dei preferiti in un array lineare di oggetti bookmark.
 * @param {Array} treeNodes - I nodi dell'albero.
 * @returns {Array} Lista piatta dei preferiti.
 */
export function flattenBookmarks(treeNodes) {
  const bookmarks = [];
  
  function recurse(nodes) {
    for (const node of nodes) {
      if (node.type === 'bookmark') {
        bookmarks.push(node);
      } else if (node.type === 'folder' && node.children) {
        recurse(node.children);
      }
    }
  }
  
  recurse(treeNodes);
  return bookmarks;
}
