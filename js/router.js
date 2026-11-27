// URL ⇄ state.
//   ?ed=4&view=stats&f=tas&sort=gap&q=razzer   the view (replaceState: no history entries)
//   #map-13 / #player-Name                      an open page (pushState: Back closes it)
// Older links (#kr4, #stats, #videos) are still understood.
import { state, $ } from './store.js';
import { safeDecode } from './format.js';

const pages = { map: null, player: null };
/** main.js registers the functions that draw a map page / profile. */
export function registerPages({ map, player }) { pages.map = map; pages.player = player; }

const VIEWS = ['maps', 'stats', 'videos'];

export function viewQuery() {
  const p = new URLSearchParams();
  if (state.ed) p.set('ed', state.ed);
  if (state.view !== 'maps') p.set('view', state.view);
  if (state.filter !== 'all') p.set('f', state.filter);
  if (state.sort !== 'id') p.set('sort', state.sort);
  if (state.q) p.set('q', state.q);
  const q = p.toString();
  return location.pathname + (q ? '?' + q : '');
}

const openHash = () => (/^#(map|player)-/.test(location.hash) ? location.hash : '');
export function writeUrl() { history.replaceState(history.state, '', viewQuery() + openHash()); }

/** Read the view from the URL into `state` (call once on load, before rendering). */
export function readUrl({ filters, sorts }) {
  const p = new URLSearchParams(location.search);
  if (p.has('ed')) state.ed = Math.min(7, Math.max(0, +p.get('ed') || 0));
  if (VIEWS.includes(p.get('view'))) state.view = p.get('view');
  if (filters.includes(p.get('f'))) state.filter = p.get('f');
  if (sorts.includes(p.get('sort'))) state.sort = p.get('sort');
  if (p.has('q')) state.q = p.get('q').toLowerCase();
  const old = location.hash.match(/^#kr(\d|all)$/);
  if (old) state.ed = old[1] === 'all' ? 0 : +old[1];
  if (location.hash === '#stats' || location.hash === '#videos') state.view = location.hash.slice(1);
  if (old || location.hash === '#stats' || location.hash === '#videos') history.replaceState(null, '', viewQuery());
}

// ---- map / player pages as history steps ----
// depth: how many pages deep (for the Back button); pushed: history entries this site added
// (closing undoes only those, so a visitor arriving from a shared link is never sent off the site).
let depth = 0, pushed = 0, ignorePop = false, closingByNav = false;
export const canGoBack = () => depth > 1 && pushed > 0;

/** Show the page named in the hash (or close the dialog if there is none). */
export function routePage(initial = false) {
  const mm = location.hash.match(/^#map-(\d+)$/), pm = location.hash.match(/^#player-(.+)$/);
  if (mm) pages.map(+mm[1]);
  else if (pm) pages.player(safeDecode(pm[1]));
  else if ($('#modal').open) { closingByNav = true; $('#modal').close(); }
  if (initial && (mm || pm)) { depth = 1; pushed = 0; }
}

export function openMap(id) {
  const h = `#map-${id}`;
  if (location.hash !== h) { history.pushState({ page: true }, '', viewQuery() + h); pushed++; depth++; }
  pages.map(id);
}
export function openPlayer(name) {
  const h = '#player-' + encodeURIComponent(name);
  if (location.hash !== h) { history.pushState({ page: true }, '', viewQuery() + h); pushed++; depth++; }
  pages.player(name);
}

window.addEventListener('popstate', () => {
  if (ignorePop) { ignorePop = false; history.replaceState(null, '', viewQuery()); return; }
  pushed = Math.max(0, pushed - 1); depth = Math.max(0, depth - 1);
  routePage();
});

/** Hook for the dialog's `close` event (✕, Esc, backdrop, or navigation). */
export function onPageClosed() {
  if (closingByNav) { closingByNav = false; depth = 0; pushed = 0; return; }
  const n = pushed; depth = 0; pushed = 0;
  if (n > 0) { ignorePop = true; history.go(-n); } // URL is tidied in the popstate handler
  else history.replaceState(null, '', viewQuery());
}
