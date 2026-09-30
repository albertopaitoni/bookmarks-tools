import { parseBookmarks, decompressMozLz4 } from './parser.js';
import { compareBookmarks } from './comparator.js';

export function processTask(type, payload) {
  if (type === 'parse') return parseBookmarks(payload);
  if (type === 'compare') return compareBookmarks(payload.a, payload.b);
  if (type !== 'decode') throw new Error('Operazione di elaborazione non riconosciuta.');
  const bytes = new Uint8Array(payload);
  const magic = [109, 111, 122, 76, 122, 52, 48, 0];
  if (magic.every((byte, i) => bytes[i] === byte)) {
    return { text: decompressMozLz4(bytes), status: 'Backup Firefox compresso (.jsonlz4) decodificato' };
  }
  const text = new TextDecoder().decode(bytes);
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let json;
    try { json = JSON.parse(trimmed); }
    catch { throw new Error('Contenuto JSON non valido: verifica il file di preferiti.'); }
    return { text, status: json?.roots ? 'Preferiti Chrome (JSON) rilevati'
      : json?.children || json?.guid || json?.root === 'placesRoot'
        ? 'Backup preferiti Firefox (JSON) rilevato' : 'File JSON rilevato' };
  }
  return { text, status: 'File preferiti HTML caricato' };
}
