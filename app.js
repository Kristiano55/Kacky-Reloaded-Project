const ED_COL = ['', 'var(--ed1)', 'var(--ed2)', 'var(--ed3)', 'var(--ed4)', 'var(--ed5)', 'var(--ed6)', 'var(--ed7)'];
const TMTAS = 'https://tmtas.exchange';
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fmt = (ms) => {
  if (ms == null) return '—';
  const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, r = ms % 1000;
  return (m ? `${m}:${String(s).padStart(2, '0')}` : `${s}`) + '.' + String(r).padStart(3, '0');
};
const fmtGap = (d) => (d == null ? '' : (d < 0 ? '−' : '+') + fmt(Math.abs(d)));

const state = { ed: 0, q: '', filter: 'all', sort: 'id', view: 'maps' };
const SCORE = { Great: 100, Good: 75, Okay: 50, Meh: 25 };
let MAPS = [];
let VIDEOS = [];
let DATES = {};
let LATEST_SEL = null;

const load = (f, d) => fetch(f, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : d)).catch(() => d);

async function init() {
  const [maps, wr, tas, upd, cls, vids, dates] = await Promise.all([
    load('data/maps.json', []), load('data/wr.json', {}), load('data/tas.json', {}), load('data/updated.json', {}), load('data/classify.json', {}), load('data/videos.json', []), load('data/tas_dates.json', {}),
  ]);
  DATES = dates;
  VIDEOS = vids;
  MAPS = maps.map((m) => {
    const runs = (tas[m.uid] || []).slice().sort((a, b) => a.t - b.t);
    const best = runs[0];
    const w = wr[m.uid]?.t ? wr[m.uid] : undefined;
    return { ...m, wr: w, runs, best, gap: best && w ? best.t - w.t : null, cut: cls[m.uid]?.outdated ? '' : cls[m.uid]?.cut || '', rating: cls[m.uid]?.outdated ? '' : cls[m.uid]?.rating || '' };
  });
  if (upd.at) $('#updated').textContent = 'Last new record ' + new Date(upd.at).toLocaleString();
  readHash();
  buildChips();
  stats();
  render();
}

function stats() {
  const withTas = MAPS.filter((m) => m.best).length;
  const beat = MAPS.filter((m) => m.gap != null && m.gap < 0);
  const saved = beat.reduce((s, m) => s - m.gap, 0);
  $('#stats').innerHTML = [
    ['acc', `${withTas}<small style="font-size:15px;color:var(--mut)">/${MAPS.length}</small>`, 'Maps TAS’d'],
    ['', `${MAPS.length ? Math.round((withTas / MAPS.length) * 100) : 0}%`, 'Completion'],
    ['', beat.length, 'TAS beats WR'],
    ['', fmt(saved), 'Time saved vs WR'],
  ].map(([c, b, s]) => `<div class="stat ${c}"><b>${b}</b><span>${s}</span></div>`).join('');

  $('#progress').innerHTML = [1, 2, 3, 4, 5, 6, 7].map((e) => {
    const ms = MAPS.filter((m) => m.ed === e), d = ms.filter((m) => m.best).length;
    return `<div class="pg" data-ed="${e}" style="--c:${ED_COL[e]}"><h4>KR${e}<small>${d}/${ms.length}</small></h4>
      <div class="meter"><i style="width:${ms.length ? (d / ms.length) * 100 : 0}%"></i></div></div>`;
  }).join('');
  document.querySelectorAll('.pg').forEach((el) => el.onclick = () => { state.ed = +el.dataset.ed; state.view = 'maps'; sync(); });
}

function buildChips() {
  $('#eds').innerHTML = ['All', 1, 2, 3, 4, 5, 6, 7].map((e, i) =>
    `<button class="chip" data-ed="${i}" style="--c:${ED_COL[i] || 'var(--acc)'}">${i ? 'KR' + e : e}</button>`).join('');
  $('#eds').onclick = (e) => { const b = e.target.closest('[data-ed]'); if (b) { state.ed = +b.dataset.ed; sync(); } };
  $('#views').onclick = (e) => { const b = e.target.closest('[data-view]'); if (b) { state.view = b.dataset.view; sync(); window.scrollTo({ top: $('main').offsetTop - 70, behavior: REDUCED ? 'auto' : 'smooth' }); } };
  let qt;
  $('#q').oninput = (e) => { state.q = e.target.value.toLowerCase(); render(); clearTimeout(qt); qt = setTimeout(writeUrl, 400); };
  $('#filter').onchange = (e) => { state.filter = e.target.value; sync(); };
  $('#sort').onchange = (e) => { state.sort = e.target.value; sync(); };
}

// ---------- URL state: ?ed=&view=&f=&sort=&q= for the view, #map-N / #player-X for an open page ----------
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
function viewQuery() {
  const p = new URLSearchParams();
  if (state.ed) p.set('ed', state.ed);
  if (state.view !== 'maps') p.set('view', state.view);
  if (state.filter !== 'all') p.set('f', state.filter);
  if (state.sort !== 'id') p.set('sort', state.sort);
  if (state.q) p.set('q', state.q);
  const q = p.toString();
  return location.pathname + (q ? '?' + q : '');
}
function writeUrl() { history.replaceState(history.state, '', viewQuery() + (/^#(map|player)-/.test(location.hash) ? location.hash : '')); }
function sync() { writeUrl(); render(); }
function readHash() {
  const p = new URLSearchParams(location.search);
  if (p.has('ed')) state.ed = Math.min(7, Math.max(0, +p.get('ed') || 0));
  if (['maps', 'stats', 'videos'].includes(p.get('view'))) state.view = p.get('view');
  if (p.has('f') && [...$('#filter').options].some((o) => o.value === p.get('f'))) state.filter = p.get('f');
  if (p.has('sort') && [...$('#sort').options].some((o) => o.value === p.get('sort'))) state.sort = p.get('sort');
  if (p.has('q')) state.q = p.get('q').toLowerCase();
  $('#filter').value = state.filter; $('#sort').value = state.sort; $('#q').value = state.q;
  // older links: #kr4, #stats, #videos
  const m = location.hash.match(/^#kr(\d|all)$/);
  if (m) state.ed = m[1] === 'all' ? 0 : +m[1];
  if (location.hash === '#stats' || location.hash === '#videos') state.view = location.hash.slice(1);
  if (m || location.hash === '#stats' || location.hash === '#videos') history.replaceState(null, '', viewQuery());
  setTimeout(() => routeModal(true), 0);
}

// ---------- map / player pages as history steps (phone back button closes them) ----------
let depth = 0, pushed = 0, ignorePop = false; // depth: pages deep; pushed: history entries this site added
function routeModal(initial) {
  const mm = location.hash.match(/^#map-(\d+)$/), pm = location.hash.match(/^#player-(.+)$/);
  if (mm) showMap(+mm[1]); else if (pm) showPlayer(safeDecode(pm[1]));
  else if ($('#modal').open) { closingByNav = true; $('#modal').close(); }
  if (initial && (mm || pm)) { depth = 1; pushed = 0; }
}
let closingByNav = false;
function navModal(hash) {
  history.pushState({ modal: true }, '', viewQuery() + hash);
  pushed++; depth++;
}
window.addEventListener('popstate', () => {
  if (ignorePop) { ignorePop = false; history.replaceState(null, '', viewQuery()); return; }
  pushed = Math.max(0, pushed - 1); depth = Math.max(0, depth - 1);
  routeModal(false);
});
function backButton() { return depth > 1 && pushed > 0 ? `<button class="back" onclick="history.back()" aria-label="Back">← Back</button>` : ''; }

function render() {
  document.querySelectorAll('#eds .chip').forEach((b) => { const on = +b.dataset.ed === state.ed; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  document.querySelectorAll('#views .chip').forEach((b) => { const on = b.dataset.view === state.view; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  const stats = state.view === 'stats', vids = state.view === 'videos';
  $('#statsView').hidden = !stats; $('#videosView').hidden = !vids; $('#grid').hidden = stats || vids;
  $('.tools').style.visibility = stats || vids ? 'hidden' : '';
  if (stats || vids) $('#latest').hidden = true;
  if (stats) { $('#empty').hidden = true; renderStats(); return; }
  if (vids) { $('#empty').hidden = true; renderVideos(); return; }
  $('#latest').hidden = false;
  renderLatest();
  let list = MAPS.filter((m) => !state.ed || m.ed === state.ed);
  if (state.q) list = list.filter((m) => [m.id, m.name, m.author, m.wr?.by, ...m.runs.map((r) => r.by)].join(' ').toLowerCase().includes(state.q));
  const f = state.filter;
  if (f === 'tas') list = list.filter((m) => m.best);
  if (f === 'none') list = list.filter((m) => !m.best);
  if (f === 'beat') list = list.filter((m) => m.gap < 0);
  if (f === 'behind') list = list.filter((m) => m.gap > 0);
  if (['Normal cut', 'Uber', 'Noseboost'].includes(f)) list = list.filter((m) => m.cut === f);
  if (f === 'unrated') list = list.filter((m) => m.best && !m.rating);
  const S = {
    id: (a, b) => a.id - b.id,
    gap: (a, b) => (a.gap ?? 1e12) - (b.gap ?? 1e12),
    wr: (a, b) => (a.wr?.t ?? 1e12) - (b.wr?.t ?? 1e12),
    recent: (a, b) => (b.wr?.date || '').localeCompare(a.wr?.date || ''),
  };
  list.sort(S[state.sort]);
  $('#empty').hidden = list.length > 0;
  $('#grid').innerHTML = list.map(card).join('');
  lazyThumbs();
}

function card(m) {
  const badge = m.gap < 0 ? '<span class="badge beat">TAS &lt; WR</span>' : m.best ? '<span class="badge tas">TAS</span>' : '<span class="badge">No TAS</span>';
  const thumb = m.thumb ? `data-bg="${esc(m.thumb)}"` : '';
  return `<button class="card" style="--c:${ED_COL[m.ed]}" onclick="openMap(${m.id})">
    <div class="thumb" ${thumb}><div class="num"><small>KR${m.ed}</small>#${m.id}</div>${badge}</div>
    <div class="cb"><div class="au">by ${esc(m.author || 'unknown')}</div>
      <div class="rows">
        <div class="r"><span class="k">WR</span><span class="v">${fmt(m.wr?.t)}</span><span class="w">${esc(m.wr?.by || '')}</span></div>
        <div class="r"><span class="k">TAS</span><span class="v" style="color:var(--acc2)">${fmt(m.best?.t)}</span><span class="w">${esc(m.best?.by || '')}</span></div>
      </div>
      ${tags(m)}<div class="delta ${m.gap == null ? 'muted' : m.gap < 0 ? 'neg' : 'pos'}">${m.gap == null ? (m.best ? 'no WR data' : 'Waiting for a TAS') : fmtGap(m.gap) + ' vs WR'}</div>
    </div></button>`;
}

function open(id) {
  if (!MAPS.find((x) => x.id === id)) return;
  if (location.hash !== `#map-${id}`) navModal(`#map-${id}`);
  showMap(id);
}
async function showMap(id) {
  const m = MAPS.find((x) => x.id === id);
  if (!m) return;
  const dlg = $('#modal');
  draw(m);
  if (!dlg.open) dlg.showModal();
  $('#m-body').scrollTop = 0;
  // live refresh of TAS runs straight from TMTAS Exchange
  try {
    const j = await fetch(`${TMTAS}/api/tick/leaderboard?map_uid=${m.uid}`).then((r) => r.json());
    const cats = Object.fromEntries((j.categories || []).map((c) => [c.id, c.name]));
    const runs = (j.records || []).map((r) => ({ by: r.name, t: r.time_ms, replay: r.replay_url, id: +new URL(r.replay_url).searchParams.get('id'), cat: cats[r.category_id] || '' }))
      .sort((a, b) => a.t - b.t);
    m.runs = runs; m.best = runs[0]; m.gap = m.best && m.wr ? m.best.t - m.wr.t : null;
    if (dlg.open) draw(m, true);
  } catch { /* keep cached */ }
}
window.openMap = open;

function draw(m, live) {
  const head = m.thumb ? `background-image:url('${esc(m.thumb)}')` : 'background-image:linear-gradient(135deg,#18202e,#0a0c12)';
  $('#m-body').innerHTML = `
  <div class="m-head" style="${head};--c:${ED_COL[m.ed]}">
    <button class="x" onclick="document.getElementById('modal').close()" aria-label="Close">✕</button>${backButton()}
    <div class="t"><h2><small>KR${m.ed}</small>#${m.id}</h2><p>by ${esc(m.author)} · author time ${fmt(m.at)}</p></div>
  </div>
  <div class="m-sec">
    <div class="cmp">
      <div class="box"><div class="l">World record · human</div><div class="big">${fmt(m.wr?.t)}</div><div>${m.wr?.by ? P(m.wr.by) : '—'} <span class="muted">${esc(m.wr?.date || '')}</span></div></div>
      <div class="box tasb"><div class="l">Best TAS</div><div class="big">${fmt(m.best?.t)}</div><div>${m.best ? P(m.best.by) : 'No TAS yet'}</div></div>
    </div>
    ${tags(m)}${m.gap != null ? `<div class="gapline ${m.gap < 0 ? 'neg' : 'pos'}">${fmtGap(m.gap)} · TAS is ${(Math.abs(m.gap) / m.wr.t * 100).toFixed(2)}% ${m.gap < 0 ? 'faster' : 'slower'} than the WR</div>` : ''}
  </div>
  <div class="m-sec">
    <h3>TAS runs ${live ? '<span class="muted" style="font-size:11px">· live</span>' : ''}</h3>
    ${m.runs.length ? `<div class="tw"><table><tr><th>#</th><th>Runner</th><th>Time</th><th>Category</th><th></th></tr>
      ${m.runs.map((r, i) => `<tr><td class="mono">${i + 1}</td><td>${P(r.by)}</td><td class="mono">${fmt(r.t)}</td><td class="muted">${esc(r.cat)}</td>
      <td style="text-align:right;white-space:nowrap"><button class="btn pri" onclick="showInputs(${r.id},this)">⌨ Inputs</button> <a class="btn" href="${esc(r.replay)}" title="Download replay">⬇</a></td></tr>
      <tr class="inrow" id="in-${r.id}" hidden><td colspan="5"></td></tr>`).join('')}</table></div>`
      : `<p class="muted">No TAS on TMTAS Exchange yet. Be the first: <a href="${TMTAS}/upload" target="_blank" rel="noopener">upload a replay</a>.</p>`}
  </div>
  ${(() => { const v = VIDEOS.filter((x) => x.map === m.id).sort((a, b) => a.outdated - b.outdated); return v.length ? `<div class="m-sec"><h3>Videos</h3><div class="vgrid one">${v.map(vcard).join('')}</div></div>` : ''; })()}
  <div class="m-sec"><div class="links">
    ${m.tmx ? `<a class="btn pri" href="https://trackmania.exchange/mapgbx/${m.tmx}" title="Download the .Map.Gbx from Trackmania Exchange">⬇ Download map</a>
      <a class="btn" target="_blank" rel="noopener" href="https://trackmania.exchange/mapshow/${m.tmx}">TMX page</a>`
      : m.file ? `<a class="btn pri" href="${esc(m.file)}" download="Kacky Reloaded #${m.id}.Map.Gbx" title="Download the map file from Nadeo's servers">⬇ Download map</a>` : ''}
    <a class="btn" target="_blank" rel="noopener" href="https://trackmania.io/#/leaderboard/${esc(m.uid)}">Trackmania.io leaderboard</a>
    <a class="btn" target="_blank" rel="noopener" href="https://trackmania.io/#/campaigns/3074/${m.campaign}">Campaign</a>
    <a class="btn" target="_blank" rel="noopener" href="${TMTAS}/upload">Upload TAS</a>
    <button class="btn" onclick="copyShare(SITE + '/m/${m.id}.html', this)" title="Link with a preview card for Discord">🔗 Copy link</button>
    <button class="btn" onclick="navigator.clipboard.writeText('${esc(m.uid)}');this.textContent='Copied ✓'">Copy map UID</button>
  </div></div>`;
}

$('#modal').addEventListener('close', () => {
  if (closingByNav) { closingByNav = false; depth = 0; pushed = 0; return; }
  // closed with ✕ / Esc / backdrop: undo only the history steps this site added (never leave the site)
  const n = pushed; depth = 0; pushed = 0;
  if (n > 0) { ignorePop = true; history.go(-n); } // URL is tidied in the popstate handler
  else history.replaceState(null, '', viewQuery());
});
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') e.target.close(); });
const SITE = location.origin + location.pathname.replace(/index\.html$/, '').replace(/\/$/, '');
const slug = (n) => String(n).replace(/[^A-Za-z0-9._-]/g, (c) => '_' + c.codePointAt(0).toString(16));
window.copyShare = (url, btn) => { navigator.clipboard.writeText(url); const t = btn.textContent; btn.textContent = 'Copied ✓'; setTimeout(() => (btn.textContent = t), 1500); };
// Player links carry the name as data, never inside inline JS (names come from outside sources)
const P = (n) => n ? `<a class="plink" href="#player-${encodeURIComponent(n)}" data-player="${esc(n)}">${esc(n)}</a>` : '';
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-player]');
  if (!a) return;
  e.preventDefault(); e.stopPropagation();
  openPlayer(a.dataset.player);
}, true);
const safeDecode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

function tags(m) {
  const t = [];
  if (m.cut && m.cut !== 'No cut') t.push(`<span class="tag cut-${m.cut.split(' ')[0].toLowerCase()}">${esc(m.cut)}</span>`);
  if (m.rating) t.push(`<span class="tag r-${m.rating.toLowerCase()}">${esc(m.rating)}</span>`);
  return t.length ? `<div class="tags">${t.join('')}</div>` : '';
}

const score = (ms) => { const r = ms.filter((m) => SCORE[m.rating]); return r.length ? (r.reduce((s, m) => s + SCORE[m.rating], 0) / r.length).toFixed(2) : '—'; };
const secs = (ms) => (ms / 1000).toFixed(3);

function renderStats() {
  const pool = state.ed ? MAPS.filter((m) => m.ed === state.ed) : MAPS;
  const scope = state.ed ? 'KR' + state.ed : 'All editions';
  const eds = (state.ed ? [state.ed] : [1, 2, 3, 4, 5, 6, 7]).map((e) => ({ label: 'KR' + e, e, ms: MAPS.filter((m) => m.ed === e) }));
  if (!state.ed) eds.push({ label: 'Total', ms: MAPS, total: true });
  const row = ({ label, e, ms, total }) => {
    const d = ms.filter((m) => m.best), p = ms.length ? d.length / ms.length : 0;
    const saved = d.reduce((s, m) => s + (m.gap ?? 0), 0);
    const c = (k) => d.filter((m) => m.cut === k).length;
    return `<tr class="${total ? 'tot' : ''}"><td><b style="color:${ED_COL[e] || 'var(--acc)'}">${label}</b></td><td class="mono">${d.length}/${ms.length}</td>
      <td><div class="meter" style="--c:${ED_COL[e] || 'var(--acc)'}"><i style="width:${p * 100}%"></i></div></td><td class="mono">${(p * 100).toFixed(1)}%</td>
      <td class="mono">${fmt(d.reduce((s, m) => s + m.best.t, 0))}</td><td class="mono">${fmt(d.reduce((s, m) => s + (m.wr?.t ?? 0), 0))}</td>
      <td class="mono ${saved < 0 ? 'neg' : ''}">${saved ? fmtGap(saved) : '—'}</td><td class="mono">${c('Normal cut')}</td><td class="mono">${c('Uber')}</td><td class="mono">${c('Noseboost')}</td></tr>`;
  };
  const rrow = ({ label, e, ms, total }) => {
    const d = ms.filter((m) => m.best), n = (k) => d.filter((m) => m.rating === k).length;
    return `<tr class="${total ? 'tot' : ''}"><td><b style="color:${ED_COL[e] || 'var(--acc)'}">${label}</b></td>
      ${['Great', 'Good', 'Okay', 'Meh'].map((k) => `<td class="mono r-${k.toLowerCase()}-t">${n(k)}</td>`).join('')}
      <td class="mono muted">${d.filter((m) => !m.rating).length}</td><td class="mono"><b>${score(d)}</b></td></tr>`;
  };
  const by = {};
  pool.filter((m) => m.best).forEach((m) => (by[m.best.by] ||= []).push(m));
  const runners = Object.entries(by).map(([n, ms]) => ({ n, ms, saved: ms.reduce((s, m) => s + (m.gap ?? 0), 0) }))
    .sort((a, b) => b.ms.length - a.ms.length || a.saved - b.saved);
  const biggest = pool.filter((m) => m.gap < 0).sort((a, b) => a.gap - b.gap).slice(0, 10);
  $('#statsView').innerHTML = `
  <div class="scope" style="--c:${ED_COL[state.ed] || 'var(--acc)'}">${scope}</div>
  <div class="panel"><h3>${state.ed ? 'Edition' : 'Editions'}</h3><div class="tw"><table><tr><th>Edition</th><th>TAS'd</th><th style="width:22%">Progress</th><th>%</th><th>TAS total</th><th>WR total</th><th>Saved</th><th>Normal cuts</th><th>Ubers</th><th>Noseboosts</th></tr>
  ${eds.map(row).join('')}</table></div></div>
  <div class="two">
    <div class="panel"><h3>Ratings</h3><div class="tw"><table><tr><th>Edition</th><th>Great</th><th>Good</th><th>Okay</th><th>Meh</th><th>Unrated</th><th>Score</th></tr>
    ${eds.map(rrow).join('')}</table></div><p class="note">Score: Great 100 · Good 75 · Okay 50 · Meh 25, averaged over rated TASes.</p></div>
    <div class="panel"><h3>Biggest timesaves</h3><div class="tw"><table><tr><th>Map</th><th>WR</th><th>TAS</th><th>Saved</th></tr>
    ${biggest.length ? '' : '<tr><td colspan="4" class="muted">No TAS faster than the WR yet.</td></tr>'}${biggest.map((m) => `<tr class="click" onclick="openMap(${m.id})"><td><b style="color:${ED_COL[m.ed]}">KR${m.ed}</b> #${m.id}</td><td class="mono">${fmt(m.wr.t)}</td><td class="mono" style="color:var(--acc2)">${fmt(m.best.t)}</td><td class="mono neg">${fmtGap(m.gap)}</td></tr>`).join('')}</table></div></div>
  </div>
  <div class="panel"><h3>Runners · ${runners.length}</h3>${runners.length ? '' : '<p class="muted">No TAS runs in this edition yet.</p>'}<div class="tw"><table><tr><th>#</th><th>Runner</th><th>TASes</th><th>Saved</th><th>Normal cuts</th><th>Ubers</th><th>Noseboosts</th><th>Avg score</th></tr>
  ${runners.map((r, i) => `<tr><td class="mono muted">${i + 1}</td><td><b>${P(r.n)}</b></td><td class="mono">${r.ms.length}</td><td class="mono neg">${fmtGap(r.saved)}</td>
    ${['Normal cut', 'Uber', 'Noseboost'].map((k) => `<td class="mono">${r.ms.filter((m) => m.cut === k).length}</td>`).join('')}<td class="mono">${score(r.ms)}</td></tr>`).join('')}</table></div></div>`;
}

const INPUTS = {};
async function showInputs(id, btn) {
  const row = document.getElementById('in-' + id);
  if (!row.hidden) { row.hidden = true; return; }
  row.hidden = false;
  const cell = row.firstElementChild;
  cell.innerHTML = '<div class="muted">Loading inputs…</div>';
  if (INPUTS[id] === undefined) {
    INPUTS[id] = await fetch(`data/inputs/${id}.txt`, { cache: 'no-cache' }).then((r) => (r.ok ? r.text() : null)).catch(() => null);
  }
  const txt = INPUTS[id];
  if (!txt) {
    cell.innerHTML = `<div class="note">Inputs for this run haven't been extracted yet (new uploads are processed every 30 min). Meanwhile you can use the <a href="${TMTAS}/tools?module=input-extractor" target="_blank" rel="noopener">TMTAS Input Extractor</a> on the replay.</div>`;
    return;
  }
  const lines = txt.split('\n').filter((l) => l).length;
  cell.innerHTML = `<div class="inputs"><div class="ibar"><span class="muted">${lines} lines · TM2020 format (same as TMTAS Input Extractor)</span>
    <span><button class="btn pri" data-copy>Copy inputs</button> <a class="btn" download="kacky-${id}.txt" href="data/inputs/${id}.txt">Save .txt</a></span></div>
    <pre>${esc(txt)}</pre></div>`;
  cell.querySelector('[data-copy]').onclick = async (e) => {
    await navigator.clipboard.writeText(txt);
    e.target.textContent = 'Copied ✓'; setTimeout(() => (e.target.textContent = 'Copy inputs'), 1500);
  };
}
window.showInputs = showInputs;

function openPlayer(name) {
  const h = '#player-' + encodeURIComponent(name);
  if (location.hash !== h) navModal(h);
  showPlayer(name);
}
function showPlayer(name) {
  const runs = [];
  MAPS.forEach((m) => m.runs.forEach((r, i) => { if (r.by === name) runs.push({ m, r, rank: i + 1 }); }));
  const tops = runs.filter((x) => x.rank === 1);
  const wrs = MAPS.filter((m) => m.wr?.by === name);
  const saved = tops.reduce((s, x) => s + (x.m.gap ?? 0), 0);
  const cnt = (k) => tops.filter((x) => x.m.cut === k).length;
  const perEd = [1, 2, 3, 4, 5, 6, 7].map((e) => ({ e, n: tops.filter((x) => x.m.ed === e).length })).filter((x) => x.n);
  const maxEd = Math.max(1, ...perEd.map((x) => x.n));
  runs.sort((a, b) => a.m.id - b.m.id);
  $('#m-body').innerHTML = `
  <div class="m-head phead">
    <button class="x" onclick="document.getElementById('modal').close()" aria-label="Close">✕</button>${backButton()}
    <div class="t"><div class="avatar">${esc(name.slice(0, 1).toUpperCase())}</div><h2>${esc(name)} <button class="btn" style="vertical-align:middle;font-style:normal" onclick="copyShare(SITE + '/p/${slug(name)}.html', this)">🔗 Copy link</button></h2>
    <p>${tops.length} best TAS${tops.length === 1 ? '' : 'es'} · ${runs.length} run${runs.length === 1 ? '' : 's'} uploaded${wrs.length ? ` · holds ${wrs.length} human WR${wrs.length === 1 ? '' : 's'}` : ''}</p></div>
  </div>
  <div class="m-sec"><div class="pstats">
    <div class="box"><div class="l">Best TASes</div><div class="big">${tops.length}</div></div>
    <div class="box"><div class="l">Time saved vs WR</div><div class="big neg">${saved ? fmtGap(saved) : '—'}</div></div>
    <div class="box"><div class="l">Beats WR</div><div class="big">${tops.filter((x) => x.m.gap < 0).length}</div></div>
    <div class="box"><div class="l">Avg score</div><div class="big">${score(tops.map((x) => x.m))}</div></div>
  </div>
  <div class="tags" style="margin-top:12px"><span class="tag cut-normal">${cnt('Normal cut')} Normal cuts</span><span class="tag cut-uber">${cnt('Uber')} Ubers</span><span class="tag cut-noseboost">${cnt('Noseboost')} Noseboosts</span></div>
  </div>
  ${perEd.length ? `<div class="m-sec"><h3>By edition</h3>${perEd.map((x) => `<div class="edbar"><b style="color:${ED_COL[x.e]}">KR${x.e}</b><div class="meter" style="--c:${ED_COL[x.e]}"><i style="width:${(x.n / maxEd) * 100}%"></i></div><span class="mono">${x.n}</span></div>`).join('')}</div>` : ''}
  <div class="m-sec"><h3>TAS runs</h3>${runs.length ? `<div class="tw"><table><tr><th>Map</th><th>Time</th><th>Rank</th><th>vs WR</th><th></th></tr>
    ${runs.map((x) => { const g = x.m.wr ? x.r.t - x.m.wr.t : null; return `<tr class="click" onclick="openMap(${x.m.id})"><td><b style="color:${ED_COL[x.m.ed]}">KR${x.m.ed}</b> #${x.m.id}</td>
      <td class="mono">${fmt(x.r.t)}</td><td class="mono">${x.rank === 1 ? '<span class="tag r-great">#1</span>' : '#' + x.rank}</td>
      <td class="mono ${g < 0 ? 'neg' : 'pos'}">${g == null ? '—' : fmtGap(g)}</td><td>${tags(x.m).replace('class="tags"', 'class="tags" style="margin:0"')}</td></tr>`; }).join('')}</table></div>` : '<p class="muted">No TAS runs.</p>'}</div>
  ${(() => { const v = VIDEOS.filter((x) => x.runner && x.runner.toLowerCase() === name.toLowerCase()); return v.length ? `<div class="m-sec"><h3>Videos</h3><div class="vgrid one">${v.map(vcard).join('')}</div></div>` : ''; })()}
  ${wrs.length ? `<div class="m-sec"><h3>Human world records</h3><div class="links">${wrs.map((m) => `<button class="btn" onclick="openMap(${m.id})">KR${m.ed} #${m.id} · ${fmt(m.wr.t)}</button>`).join('')}</div></div>` : ''}`;
  const dlg = $('#modal');
  if (!dlg.open) dlg.showModal();
  $('#m-body').scrollTop = 0;
}
window.openPlayer = openPlayer;

// ---- videos ----
function embed(url) {
  let u; try { u = new URL(url); } catch { return null; }
  const h = u.hostname.replace(/^www\.|^m\./, '');
  const t = u.searchParams.get('t') || u.searchParams.get('start');
  const start = t ? (/^\d+$/.test(t) ? t : (t.match(/(\d+)h/)?.[1] || 0) * 3600 + (t.match(/(\d+)m/)?.[1] || 0) * 60 + +(t.match(/(\d+)s/)?.[1] || 0)) : 0;
  let yt = null;
  if (h === 'youtu.be') yt = u.pathname.slice(1);
  else if (h.endsWith('youtube.com')) yt = u.searchParams.get('v') || u.pathname.match(/\/(?:shorts|embed|live)\/([\w-]+)/)?.[1];
  if (yt) return { kind: 'iframe', src: `https://www.youtube-nocookie.com/embed/${yt}${start ? '?start=' + start : ''}`, thumb: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` };
  const parent = location.hostname || 'localhost';
  if (h === 'clips.twitch.tv') return { kind: 'iframe', src: `https://clips.twitch.tv/embed?clip=${u.pathname.slice(1)}&parent=${parent}&autoplay=false` };
  if (h === 'twitch.tv') {
    const clip = u.pathname.match(/\/clip\/([\w-]+)/)?.[1]; if (clip) return { kind: 'iframe', src: `https://clips.twitch.tv/embed?clip=${clip}&parent=${parent}&autoplay=false` };
    const vid = u.pathname.match(/\/videos\/(\d+)/)?.[1]; if (vid) return { kind: 'iframe', src: `https://player.twitch.tv/?video=${vid}&parent=${parent}&autoplay=false${t ? '&time=' + t : ''}` };
  }
  if (h === 'medal.tv') {
    const id = u.pathname.match(/\/clips?\/([\w-]+)/)?.[1];
    const game = u.pathname.match(/\/games\/([\w-]+)/)?.[1] || 'trackmania';
    if (id) return { kind: 'iframe', src: `https://medal.tv/games/${game}/clip/${id}?autoplay=0&muted=0&loop=0` };
  }
  if (h === 'streamable.com') return { kind: 'iframe', src: `https://streamable.com/e/${u.pathname.split('/').pop()}` };
  if (/\.(mp4|webm|mov)(\?|$)/i.test(u.pathname)) return { kind: 'video', src: url };
  return null;
}
function vcard(v) {
  const e = embed(v.url), m = v.map ? MAPS.find((x) => x.id === v.map) : null;
  const media = !e ? `<a class="vlink" href="${esc(v.url)}" target="_blank" rel="noopener">▶ Open video</a>`
    : e.kind === 'video' ? `<video src="${esc(e.src)}" controls preload="metadata"></video>`
    : `<iframe src="${esc(e.src)}" title="${esc(v.title || (m ? `KR${m.ed} #${m.id} video` : 'Video'))}" loading="lazy" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  return `<div class="vcard"><div class="vmedia">${media}</div><div class="vmeta">
    <div><b>${esc(v.title || (m ? `KR${m.ed} #${m.id}` : 'Video'))}</b>${v.outdated ? ` <span class="tag r-meh" title="A faster TAS has been uploaded since this video">Older run${v.forTas ? ' · ' + v.forTas.toFixed(3) : ''}</span>` : ''}</div>
    <div class="muted">${m ? `<a href="#map-${m.id}" onclick="openMap(${m.id});return false" style="color:${ED_COL[m.ed]}">KR${m.ed} #${m.id}</a>` : 'Compilation'}${v.runner ? ' · ' + P(v.runner) : ''} · <a href="${esc(v.url)}" target="_blank" rel="noopener">source ↗</a></div></div></div>`;
}
function renderVideos() {
  const list = VIDEOS.filter((v) => { const m = v.map ? MAPS.find((x) => x.id === v.map) : null; return !state.ed || m?.ed === state.ed; });
  $('#videosView').innerHTML = list.length
    ? `<div class="scope" style="--c:${ED_COL[state.ed] || 'var(--acc)'}">${state.ed ? 'KR' + state.ed + ' videos' : 'Videos'} · ${list.length}</div><div class="vgrid">${list.map(vcard).join('')}</div>`
    : `<div class="panel"><h3>Videos</h3><p class="muted">No videos ${state.ed ? 'for KR' + state.ed + ' ' : ''}yet. Add a YouTube, Twitch, Streamable or .mp4 link in the tracker sheet's <b>Videos</b> tab and it shows up here.</p></div>`;
}

// ---- latest TASes (main page) ----
const ago = (unix) => {
  if (!unix) return '';
  const s = Date.now() / 1000 - unix;
  if (s < 3600) return Math.max(1, Math.round(s / 60)) + ' min ago';
  if (s < 86400) return Math.round(s / 3600) + ' h ago';
  if (s < 86400 * 30) return Math.round(s / 86400) + ' d ago';
  return new Date(unix * 1000).toLocaleDateString();
};
function clipFor(m, r) {
  const v = VIDEOS.filter((x) => x.map === m.id);
  return v.find((x) => x.forTas != null && Math.abs(x.forTas - r.t / 1000) < 0.0005)
    || (m.best && m.best.id === r.id ? v.find((x) => !x.outdated && x.forTas == null) : null);
}
function latestRuns() {
  return MAPS.filter((m) => !state.ed || m.ed === state.ed)
    .flatMap((m) => m.runs.map((r, i) => ({ m, r, rank: i + 1 })))
    .sort((a, b) => (DATES[b.r.id] || 0) - (DATES[a.r.id] || 0) || b.r.id - a.r.id)
    .slice(0, 5)
    .map((x) => ({ ...x, clip: clipFor(x.m, x.r), date: DATES[x.r.id] }));
}
function renderLatest() {
  const L = latestRuns();
  if (!L.length) { $('#latest').innerHTML = ''; return; }
  if (!L.some((x) => x.r.id === LATEST_SEL)) LATEST_SEL = (L.find((x) => x.clip) || L[0]).r.id;
  const sel = L.find((x) => x.r.id === LATEST_SEL);
  const g = (x) => (x.m.wr ? x.r.t - x.m.wr.t : null);
  const e = sel.clip ? embed(sel.clip.url) : null;
  const player = sel.clip
    ? (e ? (e.kind === 'video' ? `<video src="${esc(e.src)}" controls preload="metadata"></video>`
        : `<iframe src="${esc(e.src)}" title="Clip: KR${sel.m.ed} #${sel.m.id} by ${esc(sel.r.by)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`)
      : `<a class="vlink" href="${esc(sel.clip.url)}" target="_blank" rel="noopener">▶ Watch clip</a>`)
    : `<div class="noclip"><div class="big">${fmt(sel.r.t)}</div><div class="muted">No clip for this run yet. Add one in the sheet's Videos tab.</div>
        <div class="links" style="justify-content:center;margin-top:10px"><button class="btn pri" onclick="openMap(${sel.m.id})">Open map · Inputs</button><a class="btn" href="${esc(sel.r.replay)}">⬇ Replay</a></div></div>`;
  $('#latest').innerHTML = `
    <div class="lt-head"><h3>Latest TASes</h3><span class="muted">${state.ed ? 'KR' + state.ed : 'All editions'}</span></div>
    <div class="lt">
      <div class="lt-list">${L.map((x) => { const d = g(x); return `
        <button class="lt-item ${x.r.id === LATEST_SEL ? 'on' : ''}" aria-pressed="${x.r.id === LATEST_SEL}" style="--c:${ED_COL[x.m.ed]}" onclick="selectLatest(${x.r.id})">
          <span class="lt-map"><b>KR${x.m.ed}</b> #${x.m.id}</span>
          <span class="lt-who">${esc(x.r.by)}${x.rank === 1 ? ' <span class="tag r-great">#1</span>' : ''}</span>
          <span class="lt-time mono">${fmt(x.r.t)}</span>
          <span class="lt-gap mono ${d < 0 ? 'neg' : 'pos'}">${d == null ? '' : fmtGap(d)}</span>
          <span class="lt-meta">${x.clip ? '<span class="lt-clip">▶ clip</span>' : ''}<span class="muted">${ago(x.date)}</span></span>
        </button>`; }).join('')}</div>
      <div class="lt-player">
        <div class="vmedia">${player}</div>
        <div class="vmeta"><div><b style="color:${ED_COL[sel.m.ed]}">KR${sel.m.ed} #${sel.m.id}</b> · ${P(sel.r.by)} · <span class="mono">${fmt(sel.r.t)}</span>${sel.clip?.title ? ' · ' + esc(sel.clip.title) : ''}</div>
          <div class="muted"><a href="#map-${sel.m.id}" onclick="openMap(${sel.m.id});return false">Open map</a>${sel.clip ? ` · <a href="${esc(sel.clip.url)}" target="_blank" rel="noopener">source ↗</a>` : ''}</div></div>
      </div>
    </div>`;
}
window.selectLatest = (id) => { LATEST_SEL = id; renderLatest(); };

// Thumbnails load only when a card scrolls near the screen (525 images otherwise)
const thumbObs = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.style.backgroundImage = `url('${e.target.dataset.bg}')`; thumbObs.unobserve(e.target); }
}, { rootMargin: '600px 0px' }) : null;
function lazyThumbs() {
  document.querySelectorAll('.thumb[data-bg]').forEach((el) => (thumbObs ? thumbObs.observe(el) : (el.style.backgroundImage = `url('${el.dataset.bg}')`)));
}

init();
