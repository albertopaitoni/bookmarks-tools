export function debounce(callback, delay = 150) {
  let timer;
  const debounced = (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => { timer = undefined; callback(...args); }, delay);
  };
  debounced.cancel = () => { clearTimeout(timer); timer = undefined; };
  return debounced;
}

// Le chiavi non entrano negli export; le cache seguono la vita degli oggetti.
export function createBookmarkQuery() {
  const keys = new WeakMap();
  const comparisonKeys = new WeakMap();
  let sortedSource, sortedColumn, sortedDirection, sorted;
  function metadata(bookmark) {
    if (!keys.has(bookmark)) {
      const rawDate = bookmark.rawAddDate ?? bookmark.addDate;
      const date = rawDate ? new Date(rawDate) : null;
      const validDate = date && Number.isFinite(date.getTime());
      keys.set(bookmark, {
        title: (bookmark.title || '').toLowerCase(),
        url: (bookmark.url || '').toLowerCase(),
        folder: (bookmark.folderPath || []).join(' / ').toLowerCase(),
        date: validDate ? date.getTime() : -Infinity,
        year: validDate ? date.getFullYear() : null,
        month: validDate ? date.getMonth() + 1 : null
      });
    }
    return keys.get(bookmark);
  }
  return {
    select(source, { query = '', folderPath = null, period = null,
      column = 'title', direction = 'asc' } = {}) {
      if (sortedSource !== source || sortedColumn !== column || sortedDirection !== direction) {
        const sign = direction === 'asc' ? 1 : -1;
        sorted = source.map(bookmark => ({ bookmark, meta: metadata(bookmark) }));
        if (['title', 'url', 'folder', 'date'].includes(column)) {
          sorted.sort((a, b) => {
            const x = a.meta[column], y = b.meta[column];
            return x < y ? -sign : x > y ? sign : 0;
          });
        }
        sortedSource = source;
        sortedColumn = column;
        sortedDirection = direction;
      }
      const q = query.toLowerCase();
      const result = [];
      for (const { bookmark, meta } of sorted) {
        if (folderPath && !folderPath.every((part, i) => bookmark.folderPath[i] === part)) continue;
        if (q && !meta.title.includes(q) && !meta.url.includes(q) && !meta.folder.includes(q)) continue;
        if (period && (meta.year !== period.year || meta.month !== period.month)) continue;
        result.push(bookmark);
      }
      return result;
    },
    matchesComparison(bookmark, query) {
      const q = query.toLowerCase();
      if (!comparisonKeys.has(bookmark)) {
        comparisonKeys.set(bookmark, [bookmark.url, bookmark.title, bookmark.oldTitle, bookmark.newTitle,
          (bookmark.folderPath || []).join(' / '), (bookmark.oldFolderPath || []).join(' / '),
          (bookmark.newFolderPath || []).join(' / ')].map(x => (x || '').toLowerCase()));
      }
      return comparisonKeys.get(bookmark).some(value => value.includes(q));
    }
  };
}
