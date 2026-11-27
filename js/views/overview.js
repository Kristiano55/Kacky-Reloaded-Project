// Hero stats, edition chips and the per-edition progress cards.
import { fmt } from '../format.js';
import { EDITIONS } from '../model.js';
import { $, store, state, edColor } from '../store.js';

export function renderHeader() {
  const maps = store.maps;
  const withTas = maps.filter((m) => m.best).length;
  const beat = maps.filter((m) => m.gap != null && m.gap < 0);
  const saved = beat.reduce((s, m) => s - m.gap, 0);
  $('#stats').innerHTML = [
    ['acc', `${withTas}<small style="font-size:15px;color:var(--mut)">/${maps.length}</small>`, 'Maps TAS’d'],
    ['', `${maps.length ? Math.round((withTas / maps.length) * 100) : 0}%`, 'Completion'],
    ['', beat.length, 'TAS beats WR'],
    ['', fmt(saved), 'Time saved vs WR'],
  ].map(([c, b, s]) => `<div class="stat ${c}"><b>${b}</b><span>${s}</span></div>`).join('');

  $('#progress').innerHTML = EDITIONS.map((e) => {
    const ms = maps.filter((m) => m.ed === e), d = ms.filter((m) => m.best).length;
    return `<button class="pg" data-action="edition" data-ed="${e}" style="--c:${edColor(e)}"><h4>KR${e}<small>${d}/${ms.length}</small></h4>
      <div class="meter"><i style="width:${ms.length ? (d / ms.length) * 100 : 0}%"></i></div></button>`;
  }).join('');

  $('#eds').innerHTML = [0, ...EDITIONS].map((e) =>
    `<button class="chip" data-ed="${e}" style="--c:${edColor(e)}">${e ? 'KR' + e : 'All'}</button>`).join('');
}

/** Highlight the chosen edition and view. */
export function markChips() {
  document.querySelectorAll('#eds .chip').forEach((b) => { const on = +b.dataset.ed === state.ed; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  document.querySelectorAll('#views .chip').forEach((b) => { const on = b.dataset.view === state.view; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
}
