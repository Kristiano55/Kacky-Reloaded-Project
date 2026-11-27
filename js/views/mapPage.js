// The map page (dialog): WR vs best TAS, every TAS run with its inputs, videos, downloads.
import { esc, fmt, fmtGap } from '../format.js';
import { $, store, mapById, edColor, TMTAS, SITE } from '../store.js';
import { canGoBack } from '../router.js';
import { playerLink, tags, videoCard, copyButton, pageButtons } from '../html.js';

/** Fetch the map's TAS runs live from TMTAS Exchange (fresher than the 30-minute data refresh). */
async function liveRuns(m) {
  const j = await fetch(`${TMTAS}/api/tick/leaderboard?map_uid=${encodeURIComponent(m.uid)}`).then((r) => r.json());
  const cats = Object.fromEntries((j.categories || []).map((c) => [c.id, c.name]));
  return (j.records || [])
    .map((r) => ({ by: r.name, t: r.time_ms, replay: r.replay_url, id: +new URL(r.replay_url).searchParams.get('id'), cat: cats[r.category_id] || '' }))
    .sort((a, b) => a.t - b.t);
}

export async function showMapPage(id) {
  const m = mapById(id);
  if (!m) return;
  const dlg = $('#modal');
  draw(m);
  if (!dlg.open) dlg.showModal();
  $('#m-body').scrollTop = 0;
  try {
    const runs = await liveRuns(m);
    m.runs = runs; m.best = runs[0]; m.gap = m.best && m.wr ? m.best.t - m.wr.t : null;
    if (dlg.open && location.hash === `#map-${id}`) draw(m, true);
  } catch { /* keep the cached runs */ }
}

function runsTable(m) {
  if (!m.runs.length) return `<p class="muted">No TAS on TMTAS Exchange yet. Be the first: <a href="${TMTAS}/upload" target="_blank" rel="noopener">upload a replay</a>.</p>`;
  const rows = m.runs.map((r, i) => `<tr><td class="mono">${i + 1}</td><td>${playerLink(r.by)}</td><td class="mono">${fmt(r.t)}</td><td class="muted">${esc(r.cat)}</td>
      <td style="text-align:right;white-space:nowrap"><button class="btn pri" data-action="inputs" data-id="${r.id}">⌨ Inputs</button> <a class="btn" href="${esc(r.replay)}" title="Download replay">⬇</a></td></tr>
      <tr class="inrow" id="in-${r.id}" hidden><td colspan="5"></td></tr>`).join('');
  return `<div class="tw"><table><tr><th>#</th><th>Runner</th><th>Time</th><th>Category</th><th></th></tr>${rows}</table></div>`;
}

function downloadButtons(m) {
  if (m.tmx) return `<a class="btn pri" href="https://trackmania.exchange/mapgbx/${m.tmx}" title="Download the .Map.Gbx from Trackmania Exchange">⬇ Download map</a>
      <a class="btn" target="_blank" rel="noopener" href="https://trackmania.exchange/mapshow/${m.tmx}">TMX page</a>`;
  if (m.file) return `<a class="btn pri" href="${esc(m.file)}" download="Kacky Reloaded #${m.id}.Map.Gbx" title="Download the map file from Nadeo's servers">⬇ Download map</a>`;
  return '';
}

function draw(m, live = false) {
  const head = m.thumb ? `background-image:url('${esc(m.thumb)}')` : 'background-image:linear-gradient(135deg,#18202e,#0a0c12)';
  const videos = store.videos.filter((x) => x.map === m.id).sort((a, b) => a.outdated - b.outdated);
  $('#m-body').innerHTML = `
  <div class="m-head" style="${head};--c:${edColor(m.ed)}">
    ${pageButtons(canGoBack())}
    <div class="t"><h2><small>KR${m.ed}</small>#${m.id}</h2><p>by ${esc(m.author)} · author time ${fmt(m.at)}</p></div>
  </div>
  <div class="m-sec">
    <div class="cmp">
      <div class="box"><div class="l">World record · human</div><div class="big">${fmt(m.wr?.t)}</div><div>${m.wr?.by ? playerLink(m.wr.by) : '—'} <span class="muted">${esc(m.wr?.date || '')}</span></div></div>
      <div class="box tasb"><div class="l">Best TAS</div><div class="big">${fmt(m.best?.t)}</div><div>${m.best ? playerLink(m.best.by) : 'No TAS yet'}</div></div>
    </div>
    ${tags(m)}${m.gap != null ? `<div class="gapline ${m.gap < 0 ? 'neg' : 'pos'}">${fmtGap(m.gap)} · TAS is ${(Math.abs(m.gap) / m.wr.t * 100).toFixed(2)}% ${m.gap < 0 ? 'faster' : 'slower'} than the WR</div>` : ''}
  </div>
  <div class="m-sec">
    <h3>TAS runs ${live ? '<span class="muted" style="font-size:11px">· live</span>' : ''}</h3>
    ${runsTable(m)}
  </div>
  ${videos.length ? `<div class="m-sec"><h3>Videos</h3><div class="vgrid one">${videos.map(videoCard).join('')}</div></div>` : ''}
  <div class="m-sec"><div class="links">
    ${downloadButtons(m)}
    <a class="btn" target="_blank" rel="noopener" href="https://trackmania.io/#/leaderboard/${esc(m.uid)}">Trackmania.io leaderboard</a>
    <a class="btn" target="_blank" rel="noopener" href="https://trackmania.io/#/campaigns/3074/${m.campaign}">Campaign</a>
    <a class="btn" target="_blank" rel="noopener" href="${TMTAS}/upload">Upload TAS</a>
    ${copyButton(`${SITE}/m/${m.id}.html`, '🔗 Copy link', { title: 'Link with a preview card for Discord' })}
    ${copyButton(m.uid, 'Copy map UID')}
  </div></div>`;
}

// ---- inputs (per run, toggled open under its row) ----
const inputsCache = {};
export async function toggleInputs(id) {
  const row = document.getElementById('in-' + id);
  if (!row) return;
  if (!row.hidden) { row.hidden = true; return; }
  row.hidden = false;
  const cell = row.firstElementChild;
  cell.innerHTML = '<div class="muted">Loading inputs…</div>';
  if (inputsCache[id] === undefined) {
    inputsCache[id] = await fetch(`data/inputs/${id}.txt`, { cache: 'no-cache' }).then((r) => (r.ok ? r.text() : null)).catch(() => null);
  }
  const txt = inputsCache[id];
  if (!txt) {
    cell.innerHTML = `<div class="note">Inputs for this run haven't been extracted yet (new uploads are processed every 30 min). Meanwhile you can use the <a href="${TMTAS}/tools?module=input-extractor" target="_blank" rel="noopener">TMTAS Input Extractor</a> on the replay.</div>`;
    return;
  }
  const lines = txt.split('\n').filter(Boolean).length;
  cell.innerHTML = `<div class="inputs"><div class="ibar"><span class="muted">${lines} lines · TM2020 format (same as TMTAS Input Extractor)</span>
    <span>${copyButton(txt, 'Copy inputs', { cls: 'btn pri' })} <a class="btn" download="kacky-${id}.txt" href="data/inputs/${id}.txt">Save .txt</a></span></div>
    <pre>${esc(txt)}</pre></div>`;
}
