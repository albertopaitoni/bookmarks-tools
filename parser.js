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
