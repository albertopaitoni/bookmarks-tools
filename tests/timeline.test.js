import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

test('la selezione degli ultimi mesi aggiorna il filtro senza scorrere la pagina', () => {
  const source = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  const start = source.indexOf('function selectTimelineIndex(');
  const end = source.indexOf('function handleTimelineSliderInput(', start);
  const bars = Array.from({ length: 120 }, () => {
    const classes = new Set();
    return {
      classList: { add: value => classes.add(value), remove: value => classes.delete(value) },
      classes,
      scrollIntoView() { assert.fail('La selezione non deve scorrere gli antenati del grafico'); }
    };
  });
  const appState = {
    timelineRange: bars.map(() => ({})), timelineActive: true,
    timelineSelectedIndex: 0, currentPage: 3
  };
  const elements = {
    timelineSlider: { value: 0 }, timelineChart: { children: bars },
    btnTimelinePrev: {}, btnTimelineNext: {}
  };
  let displayUpdates = 0;
  let filterUpdates = 0;
  const select = runInNewContext(`${source.slice(start, end)}; selectTimelineIndex`, {
    appState, elements,
    updateTimelinePeriodDisplay() { displayUpdates++; },
    applyFiltersAndRenderTable() { filterUpdates++; }
  });

  for (const index of [0, 110, 119, 118]) {
    select(index);
    assert.equal(appState.timelineSelectedIndex, index);
    assert.equal(elements.timelineSlider.value, index);
    assert.equal(appState.currentPage, 1);
    assert.equal(elements.btnTimelinePrev.disabled, index === 0);
    assert.equal(elements.btnTimelineNext.disabled, index === 119);
    assert.deepEqual(bars.flatMap((bar, i) => bar.classes.has('active') ? [i] : []), [index]);
  }
  assert.equal(displayUpdates, 4);
  assert.equal(filterUpdates, 4);
});
