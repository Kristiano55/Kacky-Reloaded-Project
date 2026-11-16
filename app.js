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

const state = { ed: 0, part: 0, q: '', filter: 'all', sort: 'id' };
let MAPS = [];

const load = (f, d) => fetch(f, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : d)).catch(() => d);

async function init() {
  const [maps, wr, tas, upd] = await Promise.all([
    load('data/maps.json', []), load('data/wr.json', {}), load('data/tas.json', {}), load('data/updated.json', {}),
  ]);
  MAPS = maps.map((m) => {
    const runs = (tas[m.uid] || []).slice().sort((a, b) => a.t - b.t);
    const best = runs[0];
    const w = wr[m.uid];
    return { ...m, wr: w, runs, best, gap: best && w ? best.t - w.t : null };
  });
  if (upd.at) $('#updated').textContent = 'Data refreshed ' + new Date(upd.at).toLocaleString();
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
  document.querySelectorAll('.pg').forEach((el) => el.onclick = () => { state.ed = +el.dataset.ed; state.part = 0; sync(); });
}

function buildChips() {
  $('#eds').innerHTML = ['All', 1, 2, 3, 4, 5, 6, 7].map((e, i) =>
    `<button class="chip" data-ed="${i}" style="--c:${ED_COL[i] || 'var(--acc)'}">${i ? 'KR' + e : e}</button>`).join('');
  $('#parts').innerHTML = ['All', '1/3', '2/3', '3/3'].map((p, i) => `<button class="chip" data-part="${i}">${p}</button>`).join('');
  $('#eds').onclick = (e) => { const b = e.target.closest('[data-ed]'); if (b) { state.ed = +b.dataset.ed; sync(); } };
  $('#parts').onclick = (e) => { const b = e.target.closest('[data-part]'); if (b) { state.part = +b.dataset.part; sync(); } };
  $('#q').oninput = (e) => { state.q = e.target.value.toLowerCase(); render(); };
  $('#filter').onchange = (e) => { state.filter = e.target.value; render(); };
  $('#sort').onchange = (e) => { state.sort = e.target.value; render(); };
}

function sync() { location.hash = `kr${state.ed || 'all'}${state.part ? '-' + state.part : ''}`; render(); }
function readHash() {
  const m = location.hash.match(/kr(\d|all)(?:-(\d))?/);
  if (m) { state.ed = m[1] === 'all' ? 0 : +m[1]; state.part = +(m[2] || 0); }
  const mm = location.hash.match(/map-(\d+)/);
  if (mm) setTimeout(() => open(+mm[1]), 0);
}

function render() {
  document.querySelectorAll('#eds .chip').forEach((b) => b.classList.toggle('on', +b.dataset.ed === state.ed));
  document.querySelectorAll('#parts .chip').forEach((b) => b.classList.toggle('on', +b.dataset.part === state.part));
  let list = MAPS.filter((m) => (!state.ed || m.ed === state.ed) && (!state.part || m.part === state.part));
  if (state.q) list = list.filter((m) => [m.id, m.name, m.author, m.wr?.by, ...m.runs.map((r) => r.by)].join(' ').toLowerCase().includes(state.q));
  const f = state.filter;
  if (f === 'tas') list = list.filter((m) => m.best);
  if (f === 'none') list = list.filter((m) => !m.best);
  if (f === 'beat') list = list.filter((m) => m.gap < 0);
  if (f === 'behind') list = list.filter((m) => m.gap > 0);
  const S = {
    id: (a, b) => a.id - b.id,
    gap: (a, b) => (a.gap ?? 1e12) - (b.gap ?? 1e12),
    wr: (a, b) => (a.wr?.t ?? 1e12) - (b.wr?.t ?? 1e12),
    recent: (a, b) => (b.wr?.date || '').localeCompare(a.wr?.date || ''),
  };
  list.sort(S[state.sort]);
  $('#empty').hidden = list.length > 0;
  $('#grid').innerHTML = list.map(card).join('');
}

function card(m) {
  const badge = m.gap < 0 ? '<span class="badge beat">TAS &lt; WR</span>' : m.best ? '<span class="badge tas">TAS</span>' : '<span class="badge">No TAS</span>';
  const thumb = m.thumb ? `style="background-image:url('${esc(m.thumb)}')"` : `style="background-image:linear-gradient(135deg,#141a26,#0a0c12)"`;
  return `<button class="card" style="--c:${ED_COL[m.ed]}" onclick="openMap(${m.id})">
    <div class="thumb" ${thumb}><div class="num"><small>KR${m.ed}·${m.part}/3</small>#${m.id}</div>${badge}</div>
    <div class="cb"><div class="au">by ${esc(m.author || 'unknown')}</div>
      <div class="rows">
        <div class="r"><span class="k">WR</span><span class="v">${fmt(m.wr?.t)}</span><span class="w">${esc(m.wr?.by || '')}</span></div>
        <div class="r"><span class="k">TAS</span><span class="v" style="color:var(--acc2)">${fmt(m.best?.t)}</span><span class="w">${esc(m.best?.by || '')}</span></div>
      </div>
      <div class="delta ${m.gap == null ? 'muted' : m.gap < 0 ? 'neg' : 'pos'}">${m.gap == null ? (m.best ? 'no WR data' : 'Waiting for a TAS') : fmtGap(m.gap) + ' vs WR'}</div>
    </div></button>`;
}

async function open(id) {
  const m = MAPS.find((x) => x.id === id);
  if (!m) return;
  history.replaceState(null, '', `#map-${id}`);
  const dlg = $('#modal');
  draw(m);
  dlg.showModal();
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
    <button class="x" onclick="document.getElementById('modal').close()" aria-label="Close">✕</button>
    <div class="t"><h2><small>KR${m.ed} · ${m.part}/3</small>#${m.id}</h2><p>by ${esc(m.author)} · author time ${fmt(m.at)}</p></div>
  </div>
  <div class="m-sec">
    <div class="cmp">
      <div class="box"><div class="l">World record · human</div><div class="big">${fmt(m.wr?.t)}</div><div>${esc(m.wr?.by || '—')} <span class="muted">${esc(m.wr?.date || '')}</span></div></div>
      <div class="box tasb"><div class="l">Best TAS</div><div class="big">${fmt(m.best?.t)}</div><div>${esc(m.best?.by || 'No TAS yet')}</div></div>
    </div>
    ${m.gap != null ? `<div class="gapline ${m.gap < 0 ? 'neg' : 'pos'}">${fmtGap(m.gap)} · TAS is ${(Math.abs(m.gap) / m.wr.t * 100).toFixed(2)}% ${m.gap < 0 ? 'faster' : 'slower'} than the WR</div>` : ''}
  </div>
  <div class="m-sec">
    <h3>TAS runs ${live ? '<span class="muted" style="font-size:11px">· live</span>' : ''}</h3>
    ${m.runs.length ? `<table><tr><th>#</th><th>Runner</th><th>Time</th><th>Category</th><th></th></tr>
      ${m.runs.map((r, i) => `<tr><td class="mono">${i + 1}</td><td>${esc(r.by)}</td><td class="mono">${fmt(r.t)}</td><td class="muted">${esc(r.cat)}</td>
      <td style="text-align:right"><a class="btn pri" href="${esc(r.replay)}">⬇ Replay</a></td></tr>`).join('')}</table>
      <div class="note">To get the inputs, download the replay and drop it into the <a href="${TMTAS}/tools" target="_blank" rel="noopener">TMTAS Input Extractor</a>. It supports TM2020 and runs locally in your browser.</div>`
      : `<p class="muted">No TAS on TMTAS Exchange yet. Be the first: <a href="${TMTAS}/upload" target="_blank" rel="noopener">upload a replay</a>.</p>`}
  </div>
  <div class="m-sec"><div class="links">
    <a class="btn" target="_blank" rel="noopener" href="https://trackmania.io/#/leaderboard/${esc(m.uid)}">Trackmania.io leaderboard</a>
    <a class="btn" target="_blank" rel="noopener" href="https://trackmania.io/#/campaigns/3074/${m.campaign}">Campaign</a>
    <a class="btn" target="_blank" rel="noopener" href="${TMTAS}/upload">Upload TAS</a>
    <button class="btn" onclick="navigator.clipboard.writeText('${esc(m.uid)}');this.textContent='Copied ✓'">Copy map UID</button>
  </div></div>`;
}

$('#modal').addEventListener('close', () => history.replaceState(null, '', `#kr${state.ed || 'all'}${state.part ? '-' + state.part : ''}`));
$('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') e.target.close(); });
init();
