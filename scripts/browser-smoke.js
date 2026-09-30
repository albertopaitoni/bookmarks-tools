import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createRequire } from 'node:module';
import { createDevServer } from './dev-server.js';

// Si può usare Playwright installato nel progetto o quello fornito dall'ambiente.
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright')); }
catch { throw new Error('Playwright richiesto: installalo o imposta PLAYWRIGHT_MODULE_PATH.'); }
const server = createDevServer();
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const base = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true,
    ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
  const context = await browser.newContext({ reducedMotion: 'reduce', acceptDownloads: true });
  const external = [], errors = [], workers = [];
  await context.route('**/*', route => {
    const url = route.request().url();
    if (url.startsWith(base + '/') || url.startsWith('data:') || url.startsWith('blob:')) return route.continue();
    external.push(url); return route.abort();
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('worker', worker => workers.push(worker.url()));
  await page.goto(base);
  await page.locator('#btn-load-example').click();
  await page.waitForFunction(() => document.querySelector('#table-total-count').textContent === '6');
  const flat = JSON.parse(await page.locator('#code-output-text').inputValue());
  assert.equal(flat.length, 6);
  await page.locator('#table-search').fill('OpenAI');
  await page.waitForFunction(() => document.querySelector('#table-total-count').textContent === '1');
  assert.match(await page.locator('#table-body').innerText(), /OpenAI/);
  await page.locator('#table-search').fill('');
  await page.waitForFunction(() => document.querySelector('#table-total-count').textContent === '6');
  for (const format of ['csv', 'markdown', 'sql', 'json-tree', 'json-flat']) {
    await page.locator(`#results-container [data-format="${format}"]`).click();
    assert.ok((await page.locator('#code-output-text').inputValue()).length > 0);
  }
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#btn-download-code').click();
  assert.match((await downloadPromise).suggestedFilename(), /\.json$/);
  await page.locator('#table-body .btn-qr-action').first().click();
  await page.waitForFunction(() => document.querySelector('#qr-modal').getAttribute('aria-hidden') === 'false');
  assert.ok(await page.locator('#qr-canvas').evaluate(canvas => canvas.width > 0));
  await page.locator('#qr-modal-close').click();

  await page.locator('#tab-btn-graph').click();
  await page.waitForSelector('.graph-node');
  const collapsed = await page.locator('.graph-node').count();
  await page.locator('.graph-node.collapsed').first().dispatchEvent('click');
  assert.ok(await page.locator('.graph-node').count() > collapsed);
  const ids = await page.locator('.graph-node').evaluateAll(nodes => nodes.map(node => node.__data__.id));
  assert.equal(new Set(ids).size, ids.length);
  await page.locator('#tab-btn-table').click();
  const transform = await page.locator('.graph-node').evaluateAll(nodes => nodes.map(node => node.getAttribute('transform')));
  await page.waitForTimeout(400);
  assert.deepEqual(await page.locator('.graph-node').evaluateAll(nodes => nodes.map(node => node.getAttribute('transform'))), transform);
  await page.locator('#tab-btn-graph').click();
  await page.locator('#btn-graph-type-sunburst').click();
  assert.ok(await page.locator('#graph-canvas-container path').count() > 0);
  await page.locator('#mode-compare-tab').click();
  await page.locator('#btn-load-compare-example').click();
  await page.waitForFunction(() => document.querySelector('#compare-total-count').textContent === '7');
  const report = JSON.parse(await page.locator('#compare-code-output-text').inputValue());
  assert.deepEqual(Object.fromEntries(Object.entries(report).map(([key, value]) => [key, value.length])),
    { added: 2, removed: 1, modified: 2, identical: 2 });
  await page.locator('#compare-table-search').fill('Facebook');
  await page.waitForFunction(() => document.querySelector('#compare-total-count').textContent === '1');
  for (const format of ['csv', 'markdown', 'json']) {
    await page.locator(`#compare-export-tabs [data-format="${format}"]`).click();
    assert.ok((await page.locator('#compare-code-output-text').inputValue()).length > 0);
  }

  await page.locator('#mode-convert-tab').click();
  await page.locator('#tab-btn-table').click();
  const chrome = { roots: { bookmark_bar: { type: 'folder', name: 'Bar', children: [
    { type: 'url', name: 'Febbraio', url: 'https://example.com/feb', date_added: '13382884800000000' },
    { type: 'url', name: 'Gennaio', url: 'https://example.com/jan', date_added: '13382841600000000' }
  ] } } };
  await page.locator('#file-input').setInputFiles({ name: 'bookmarks.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(chrome)) });
  await page.waitForFunction(() => document.querySelector('#selected-file-info').textContent.includes('Chrome'));
  await page.locator('#btn-process').click();
  await page.waitForFunction(() => document.querySelector('#table-total-count').textContent === '2');
  await page.locator('[data-sort="date"]').click();
  const dateOrder = await page.locator('#table-body .bookmark-title-text').allTextContents();
  for (const format of ['locale', 'unix', 'iso']) {
    await page.locator('#opt-date-format').selectOption(format);
    await page.waitForFunction(() => document.querySelector('#app-loader').classList.contains('hidden'));
    assert.deepEqual(await page.locator('#table-body .bookmark-title-text').allTextContents(), dateOrder);
  }

  // Worker reale: messaggi concorrenti, errori e LZ4, usando lo stesso client della UI.
  const workerProof = await page.evaluate(async () => {
    const { runProcessingTask } = await import('./src/worker-client.js');
    const bytes = new Uint8Array([109, 111, 122, 76, 122, 52, 48, 0, 2, 0, 0, 0, 32, 123, 125]);
    const [decoded, report] = await Promise.all([
      runProcessingTask('decode', bytes.buffer), runProcessingTask('compare', { a: [], b: [] })
    ]);
    let error;
    try { await runProcessingTask('parse', '{invalid'); } catch (e) { error = e.message; }
    return { decoded: decoded.text, identical: report.identical.length, error };
  });
  assert.equal(workerProof.decoded, '{}');
  assert.equal(workerProof.identical, 0);
  assert.match(workerProof.error, /JSON/);
  assert.ok(workers.some(url => url.endsWith('/processing-worker.js')));
  await page.evaluate(() => document.fonts.ready);
  assert.deepEqual(external, [], 'La pagina non deve richiedere asset esterni');
  assert.deepEqual(errors, [], 'Nessun errore JavaScript nel browser');
  console.log('Browser OK: HTML, JSON, confronto, ricerca, export, date, grafici, QR, worker e asset locali.');
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
