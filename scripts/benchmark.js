import { createBookmarkQuery } from '../src/query.js';

for (const size of [10000, 50000]) {
  const source = Array.from({ length: size }, (_, i) => ({
    title: `Link ${i}`, url: `https://example.com/${i}`, folderPath: [`Folder ${i % 20}`], addDate: ''
  }));
  const terms = ['link 1', 'link 2', 'link 3', 'folder 1', 'example'];
  const legacy = term => source.filter(b => b.title.toLowerCase().includes(term) ||
    b.url.toLowerCase().includes(term) || b.folderPath.join(' / ').toLowerCase().includes(term))
    .sort((a, b) => a.title.toLowerCase() < b.title.toLowerCase() ? -1 :
      a.title.toLowerCase() > b.title.toLowerCase() ? 1 : 0);
  const query = createBookmarkQuery();
  const start = performance.now();
  query.select(source);
  const preparation = performance.now() - start;
  const measure = fn => {
    const start = performance.now();
    for (let repeat = 0; repeat < 10; repeat++) for (const term of terms) fn(term);
    return performance.now() - start;
  };
  console.log(JSON.stringify({ bookmarks: size, queries: 50,
    preparationMs: +preparation.toFixed(1), beforeMs: +measure(legacy).toFixed(1),
    afterMs: +measure(term => query.select(source, { query: term })).toFixed(1) }));
}
