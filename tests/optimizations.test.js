import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createBookmarkQuery, debounce } from '../src/query.js';
import { formatTreeDates } from '../src/dates.js';
import { generateCSV, generateMarkdown, generateSQL } from '../src/exporters.js';
import { escapeCSV, markdownLink } from '../src/export-utils.js';
import { generateCompareCSV, generateCompareMarkdown, compareBookmarks } from '../src/comparator.js';
import { runProcessingTask, disposeProcessingWorker } from '../src/worker-client.js';
import { createDevServer } from '../scripts/dev-server.js';

const b = (title, date = '', folderPath = ['Cartella']) => ({
  type: 'bookmark', title, url: `https://example.com/${encodeURIComponent(title)}`,
  folderPath, addDate: date, icon: ''
});

test('la data è ordinata cronologicamente con tutti i formati di visualizzazione', () => {
  const data = [b('Febbraio', '2025-02-01T12:00:00Z'),
    b('Gennaio', '2025-01-31T12:00:00Z'), b('Assente'), b('Invalida', 'invalid')];
  for (const format of ['iso', 'locale', 'unix']) {
    const query = createBookmarkQuery();
    const source = formatTreeDates(data, format);
    assert.deepEqual(query.select(source, { column: 'date' }).map(x => x.title),
      ['Assente', 'Invalida', 'Gennaio', 'Febbraio']);
    assert.deepEqual(query.select(source, { column: 'date', direction: 'desc' }).map(x => x.title),
      ['Febbraio', 'Gennaio', 'Assente', 'Invalida']);
  }
});

test('ricerca, cartella e periodo si combinano senza modificare i dati', () => {
  const source = [b('Zeta', '2025-02-01', ['A']), b('Beta', '2025-02-02', ['A', 'B']),
    b('Alfa', '2025-01-31', ['A']), b('Fuori', '2025-02-03', ['Altro'])];
  const before = structuredClone(source);
  const query = createBookmarkQuery();
  assert.deepEqual(query.select(source, { folderPath: ['A'], period: { year: 2025, month: 2 } })
    .map(x => x.title), ['Beta', 'Zeta']);
  assert.deepEqual(query.select(source, { query: 'A / B' }).map(x => x.title), ['Beta']);
  assert.equal(query.select(source, { query: 'example.com' }).length, 4);
  assert.deepEqual(source, before);
  assert.deepEqual(query.select([b('Nuovo')]).map(x => x.title), ['Nuovo']);
});

test('il confronto cerca anche nei vecchi titoli e nelle vecchie cartelle', () => {
  const item = compareBookmarks([b('Prima', '', ['Vecchia'])],
    [{ ...b('Dopo', '', ['Nuova']), url: b('Prima').url }]).modified[0];
  const query = createBookmarkQuery();
  for (const term of ['PRIMA', 'dopo', 'vecchia', 'nuova']) assert.equal(query.matchesComparison(item, term), true);
  assert.equal(query.matchesComparison(item, 'inesistente'), false);
});

test('debounce esegue solo l’ultimo input e permette di cancellarlo', async () => {
  const calls = [];
  const callback = debounce(value => calls.push(value), 5);
  callback('a'); callback('ab'); callback('abc');
  await new Promise(resolve => setTimeout(resolve, 25));
  assert.deepEqual(calls, ['abc']);
  callback('cancel'); callback.cancel();
  await new Promise(resolve => setTimeout(resolve, 25));
  assert.deepEqual(calls, ['abc']);
});

test('CSV conserva virgolette e newline e neutralizza le formule', () => {
  assert.equal(escapeCSV('a"b\nc'), '"a""b\nc"');
  for (const input of ['=1+1', ' +SUM(A1)', '@SUM(A1)', '-1', '\t=1']) {
    assert.ok(escapeCSV(input).startsWith('"\''));
  }
  const data = [b('=1+1')];
  assert.ok(generateCSV(data).includes('"\'=1+1"'));
  assert.ok(generateCompareCSV(compareBookmarks([], data)).includes('"\'=1+1"'));
});

test('Markdown neutralizza markup e gestisce URL con parentesi', () => {
  const input = { ...b('[Titolo]\n<script>'), url: 'https://example.com/a(b)' };
  const output = generateMarkdown([input]);
  assert.ok(output.includes('\\[Titolo\\] &lt;script&gt;'));
  assert.ok(output.includes('(<https://example.com/a%28b%29>)'));
  assert.ok(generateCompareMarkdown(compareBookmarks([], [input])).includes('\\[Titolo\\]'));
  assert.equal(markdownLink('Script', 'javascript:alert(1)'), 'Script');
  assert.ok(generateSQL([b("L'apostrofo")]).includes("L''apostrofo"));
});

test('l’elaborazione funziona anche senza Web Worker e propaga gli errori', async () => {
  const chrome = { roots: { bookmark_bar: { type: 'folder', name: 'Bar', children: [
    { type: 'url', name: 'Link', url: 'https://example.com' }
  ] } } };
  const data = await runProcessingTask('parse', JSON.stringify(chrome));
  assert.equal(data[0].title, 'Link');
  const results = await runProcessingTask('compare', { a: data, b: data });
  assert.equal(results.identical.length, 1);
  assert.equal((await runProcessingTask('decode', new TextEncoder().encode(JSON.stringify(chrome)).buffer))
    .status, 'Preferiti Chrome (JSON) rilevati');
  await assert.rejects(runProcessingTask('parse', '{invalid'), /JSON/);
  await assert.rejects(runProcessingTask('unknown', null));
  disposeProcessingWorker();
});

test('un worker non avviabile riprende tutte le richieste pendenti senza perdere dati', async () => {
  const original = globalThis.Worker;
  let terminated = false;
  globalThis.Worker = class {
    postMessage() { queueMicrotask(() => this.onerror({ preventDefault() {} })); }
    terminate() { terminated = true; }
  };
  const client = await import('../src/worker-client.js?failure-test');
  try {
    const [decoded, result] = await Promise.all([
      client.runProcessingTask('decode', new TextEncoder().encode('<DL></DL>').buffer),
      client.runProcessingTask('compare', { a: [], b: [b('Nuovo')] })
    ]);
    assert.equal(decoded.text, '<DL></DL>');
    assert.equal(result.added.length, 1);
    assert.equal(terminated, true);
  } finally {
    client.disposeProcessingWorker();
    if (original === undefined) delete globalThis.Worker;
    else globalThis.Worker = original;
  }
});

test('il server fornisce moduli e font e rifiuta file nascosti e traversal', async () => {
  const server = createDevServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(base + '/')).status, 200);
    const module = await fetch(base + '/src/processing-worker.js');
    assert.match(module.headers.get('content-type'), /javascript/);
    assert.equal((await fetch(base + '/vendor/fonts.css')).status, 200);
    for (const path of ['/.git/config', '/%2e%2e%5cpackage.json', '/node_modules/private', '/missing.js']) {
      assert.ok((await fetch(base + path)).status >= 400);
    }
    assert.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
