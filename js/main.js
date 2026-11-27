// Entry point: load data, wire up the controls, render.
//
//   format.js   pure helpers (also used by scripts/build_pages.mjs)
//   embed.js    video link → embeddable player
//   model.js    data model: build / filter / summarise maps (pure, tested)
//   store.js    shared browser state
//   router.js   URL ⇄ state, map/profile pages as history steps
//   html.js     shared HTML pieces (player links, tags, video cards)
//   views/*     one file per part of the page
//
// All clicks go through one handler below, keyed on data-action / data-player attributes.
import { buildMaps } from './model.js';
import { $, state, store, REDUCED_MOTION } from './store.js';
import { readUrl, writeUrl, routePage, registerPages, openMap, openPlayer, onPageClosed } from './router.js';
import { renderHeader, markChips } from './views/overview.js';
import { renderGrid } from './views/grid.js';
import { renderLatest, selectLatest } from './views/latest.js';
import { renderStats } from './views/stats.js';
import { renderVideos } from './views/videos.js';
import { showMapPage, toggleInputs } from './views/mapPage.js';
import { showPlayerPage } from './views/playerPage.js';

const load = (f, d) => fetch(f).then((r) => (r.ok ? r.json() : d)).catch(() => d);

/** One request in production (data/site.json, built at deploy and preloaded by index.html);
 *  the separate files when running from source without a build. */
async function loadData() {
  const v = document.querySelector('link[rel=preload][as=fetch]')?.getAttribute('href') || 'data/site.json';
  const site = await load(v, null);
  if (site?.maps) return site;
  const [maps, wr, tas, updated, classify, videos, dates] = await Promise.all([
    load('data/maps.json', []), load('data/wr.json', {}), load('data/tas.json', {}), load('data/updated.json', {}),
    load('data/classify.json', {}), load('data/videos.json', []), load('data/tas_dates.json', {}),
  ]);
  return { maps, wr, tas, classify, videos, dates, updated: updated.at || null };
}

export function render() {
  markChips();
  const view = state.view;
  $('#statsView').hidden = view !== 'stats';
  $('#videosView').hidden = view !== 'videos';
  $('#grid').hidden = view !== 'maps';
  $('#latest').hidden = view !== 'maps';
  $('.tools').style.visibility = view === 'maps' ? '' : 'hidden';
  if (view === 'stats') { $('#empty').hidden = true; renderStats(); return; }
  if (view === 'videos') { $('#empty').hidden = true; renderVideos(); return; }
  renderLatest();
  renderGrid();
}

/** Change the view state, mirror it in the URL, re-render. */
function update(changes, { scroll = false } = {}) {
  Object.assign(state, changes);
  writeUrl();
  render();
  if (scroll) window.scrollTo({ top: $('main').offsetTop - 70, behavior: REDUCED_MOTION ? 'auto' : 'smooth' });
}

function flash(btn, text = 'Copied ✓') {
  const old = btn.textContent; btn.textContent = text;
  setTimeout(() => (btn.textContent = old), 1500);
}

// ---- one click handler for the whole page ----
const actions = {
  map: (el) => openMap(+el.dataset.id),
  inputs: (el) => toggleInputs(+el.dataset.id),
  latest: (el) => selectLatest(+el.dataset.id),
  edition: (el) => update({ ed: +el.dataset.ed, view: 'maps' }),
  copy: (el) => navigator.clipboard.writeText(el.dataset.text).then(() => flash(el)),
  close: () => $('#modal').close(),
  back: () => history.back(),
};
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-player], [data-action]');
  if (!el) return;
  if (el.dataset.player != null) { e.preventDefault(); openPlayer(el.dataset.player); return; }
  const run = actions[el.dataset.action];
  if (run) { e.preventDefault(); run(el); }
});

function wireControls() {
  $('#eds').addEventListener('click', (e) => { const b = e.target.closest('[data-ed]'); if (b) update({ ed: +b.dataset.ed }); });
  $('#views').addEventListener('click', (e) => { const b = e.target.closest('[data-view]'); if (b) update({ view: b.dataset.view }, { scroll: true }); });
  let typing;
  $('#q').addEventListener('input', (e) => { state.q = e.target.value.toLowerCase(); render(); clearTimeout(typing); typing = setTimeout(writeUrl, 400); });
  $('#filter').addEventListener('change', (e) => update({ filter: e.target.value }));
  $('#sort').addEventListener('change', (e) => update({ sort: e.target.value }));
  $('#modal').addEventListener('close', onPageClosed);
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') e.target.close(); });
}

async function init() {
  const { maps, wr, tas, classify, videos, dates, updated } = await loadData();
  Object.assign(store, { maps: buildMaps({ maps, wr, tas, classify }), videos, dates, updated });
  if (store.updated) $('#updated').textContent = 'Last new record ' + new Date(store.updated).toLocaleString();

  const options = (sel) => [...$(sel).options].map((o) => o.value);
  readUrl({ filters: options('#filter'), sorts: options('#sort') });
  $('#filter').value = state.filter; $('#sort').value = state.sort; $('#q').value = state.q;

  registerPages({ map: showMapPage, player: showPlayerPage });
  renderHeader();
  wireControls();
  render();
  routePage(true);
}

init();
