// Gli URL originali restano disponibili per esportazione e confronto.
// La UI rende navigabili solo protocolli esplicitamente ammessi.
export function safeBookmarkUrl(value) {
  try {
    const url = new URL(value);
    return ['http:', 'https:', 'ftp:', 'file:', 'mailto:', 'tel:', 'about:',
      'chrome:', 'edge:', 'moz-extension:', 'chrome-extension:'].includes(url.protocol)
      ? url.href : '';
  } catch {
    return '';
  }
}

export function openBookmarkUrl(value) {
  const url = safeBookmarkUrl(value);
  if (url) window.open(url, '_blank', 'noopener,noreferrer');
}
