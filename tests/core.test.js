import test from 'node:test';
import assert from 'node:assert/strict';
import { compareBookmarks } from '../comparator.js';
import { decompressMozLz4, parseBookmarks } from '../parser.js';
import { safeBookmarkUrl, openBookmarkUrl } from '../urls.js';

const bookmark = (title, folderPath = [], url = 'https://example.com') =>
  ({ type: 'bookmark', title, folderPath, url, addDate: '', icon: '' });

test('il confronto distingue aggiunte, rimozioni, titoli e spostamenti', () => {
  const a = [bookmark('Identico'), bookmark('Vecchio', [], 'rename'),
    bookmark('Spostato', ['A'], 'move'), bookmark('Rimosso', [], 'removed')];
  const b = [bookmark('Identico'), bookmark('Nuovo', [], 'rename'),
    bookmark('Spostato', ['B'], 'move'), bookmark('Aggiunto', [], 'added')];
  const before = structuredClone([a, b]);
  const result = compareBookmarks(a, b);
  assert.equal(result.identical.length, 1);
  assert.equal(result.added[0].url, 'added');
  assert.equal(result.removed[0].url, 'removed');
  assert.deepEqual(result.modified.map(x => [x.titleChanged, x.folderChanged]),
    [[true, false], [false, true]]);
  assert.deepEqual([a, b], before);
});

test('i duplicati si abbinano una sola volta, con precedenza ai match esatti', () => {
  const result = compareBookmarks(
    [bookmark('Esatto'), bookmark('Vecchio'), bookmark('Duplicato'), bookmark('Duplicato')],
    [bookmark('Nuovo'), bookmark('Esatto'), bookmark('Duplicato')]);
  assert.deepEqual(result.identical.map(x => x.title), ['Esatto', 'Duplicato']);
  assert.equal(result.modified[0].oldTitle, 'Vecchio');
  assert.equal(result.removed[0].title, 'Duplicato');
  assert.equal(result.added.length, 0);
});

test('il match nella stessa cartella precede quello per solo URL', () => {
  const result = compareBookmarks([bookmark('A', ['A']), bookmark('B', ['B'])],
    [bookmark('Nuovo', ['C']), bookmark('Rinominato', ['B'])]);
  assert.deepEqual(result.modified.map(x => x.oldTitle), ['B', 'A']);
});

test('nomi con separatori non confondono cartelle diverse', () => {
  const result = compareBookmarks([bookmark('Link', ['A / B'])],
    [bookmark('Link', ['A', 'B'])]);
  assert.equal(result.identical.length, 0);
  assert.equal(result.modified[0].folderChanged, true);
});

test('liste vuote e migliaia di duplicati conservano tutte le occorrenze', () => {
  assert.deepEqual(compareBookmarks([], []), { added: [], removed: [], modified: [], identical: [] });
  const a = Array.from({ length: 5000 }, () => bookmark('Vecchio'));
  const b = Array.from({ length: 4000 }, () => bookmark('Nuovo'));
  const result = compareBookmarks(a, b);
  assert.equal(result.modified.length, 4000);
  assert.equal(result.removed.length, 1000);
  assert.equal(result.added.length, 0);
});

function backup(size, payload) {
  const bytes = new Uint8Array(12 + payload.length);
  bytes.set([109, 111, 122, 76, 122, 52, 48, 0]);
  new DataView(bytes.buffer).setUint32(8, size, true);
  bytes.set(payload, 12);
  return bytes;
}

test('Firefox LZ4 decodifica letterali, viste con offset e match sovrapposti', () => {
  const valid = backup(2, [0x20, 123, 125]);
  assert.equal(decompressMozLz4(valid), '{}');
  const padded = new Uint8Array(valid.length + 5);
  padded.set(valid, 5);
  assert.equal(decompressMozLz4(padded.subarray(5)), '{}');
  assert.equal(decompressMozLz4(backup(5, [0x10, 97, 1, 0])), 'aaaaa');
  assert.equal(decompressMozLz4(backup(0, [])), '');
});

test('Firefox LZ4 rifiuta header troncati e dimensioni eccessive', () => {
  assert.throws(() => decompressMozLz4(backup(0, []).subarray(0, 8)));
  assert.throws(() => decompressMozLz4(backup(0xffffffff, [])));
});

test('Firefox LZ4 rifiuta dati troncati, offset invalidi e output incoerente', () => {
  for (const bytes of [backup(2, [0x20, 123]), backup(1, [0xf0]),
    backup(5, [0x10, 97, 0, 0]), backup(5, [0x10, 97, 2, 0]),
    backup(5, [0x10, 97, 1]), backup(5, [0x1f, 97, 1, 0]),
    backup(1, [0x20, 97, 98]), backup(3, [0x20, 123, 125]),
    backup(1, [0x10, 97, 42])]) {
    assert.throws(() => decompressMozLz4(bytes));
  }
});

test('un JSON invalido segnala un errore specifico senza tentare il parsing HTML', () => {
  assert.throws(() => parseBookmarks('{invalid'), /JSON/i);
});

test('la navigazione blocca script, documenti data e URL relativi', () => {
  for (const value of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)',
    'java\nscript:alert(1)', 'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)', '/relative', 'not a URL']) {
    assert.equal(safeBookmarkUrl(value), '');
  }
  assert.equal(safeBookmarkUrl('https://example.com/?q="test"'),
    'https://example.com/?q=%22test%22');
  assert.equal(safeBookmarkUrl('mailto:hello@example.com'), 'mailto:hello@example.com');
  assert.equal(safeBookmarkUrl('file:///tmp/bookmark.html'), 'file:///tmp/bookmark.html');
});

test('i link aperti non hanno accesso alla finestra originale', () => {
  const calls = [];
  const original = globalThis.window;
  globalThis.window = { open: (...args) => calls.push(args) };
  try {
    openBookmarkUrl('javascript:alert(1)');
    openBookmarkUrl('https://example.com');
    assert.deepEqual(calls, [['https://example.com/', '_blank', 'noopener,noreferrer']]);
  } finally {
    if (original === undefined) delete globalThis.window;
    else globalThis.window = original;
  }
});
