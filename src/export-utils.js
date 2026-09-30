import { safeBookmarkUrl } from './urls.js';

export function escapeCSV(value) {
  let text = String(value ?? '');
  // Le virgolette CSV non impediscono l'interpretazione come formula.
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function escapeMarkdown(value) {
  return String(value ?? '').replace(/[\r\n]+/g, ' ')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/([\\`*_[\]{}()#+.!|>~-])/g, '\\$1');
}

export function markdownLink(title, url) {
  const label = escapeMarkdown(title || url);
  const safe = safeBookmarkUrl(url);
  return safe ? `[${label}](<${safe.replace(/</g, '%3C').replace(/>/g, '%3E')
    .replace(/\(/g, '%28').replace(/\)/g, '%29')}>)` : label;
}
