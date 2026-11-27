// Stats view: per-edition progress and time saved, ratings, biggest timesaves, runner board.
import { fmt, fmtGap, score } from '../format.js';
import { EDITIONS, CUTS, runnerBoard } from '../model.js';
import { $, store, state, edColor } from '../store.js';
import { playerLink } from '../html.js';

const RATINGS = ['Great', 'Good', 'Okay', 'Meh'];

function editionRow({ label, e, ms, total }) {
  const d = ms.filter((m) => m.best), p = ms.length ? d.length / ms.length : 0;
  const saved = d.reduce((s, m) => s + (m.gap ?? 0), 0);
  return `<tr class="${total ? 'tot' : ''}"><td><b style="color:${edColor(e)}">${label}</b></td><td class="mono">${d.length}/${ms.length}</td>
    <td><div class="meter" style="--c:${edColor(e)}"><i style="width:${p * 100}%"></i></div></td><td class="mono">${(p * 100).toFixed(1)}%</td>
    <td class="mono">${fmt(d.reduce((s, m) => s + m.best.t, 0))}</td><td class="mono">${fmt(d.reduce((s, m) => s + (m.wr?.t ?? 0), 0))}</td>
    <td class="mono ${saved < 0 ? 'neg' : ''}">${saved ? fmtGap(saved) : '—'}</td>
    ${CUTS.map((k) => `<td class="mono">${d.filter((m) => m.cut === k).length}</td>`).join('')}</tr>`;
}

function ratingRow({ label, e, ms, total }) {
  const d = ms.filter((m) => m.best);
  return `<tr class="${total ? 'tot' : ''}"><td><b style="color:${edColor(e)}">${label}</b></td>
    ${RATINGS.map((k) => `<td class="mono r-${k.toLowerCase()}-t">${d.filter((m) => m.rating === k).length}</td>`).join('')}
    <td class="mono muted">${d.filter((m) => !m.rating).length}</td><td class="mono"><b>${score(d)}</b></td></tr>`;
}

export function renderStats() {
  const pool = state.ed ? store.maps.filter((m) => m.ed === state.ed) : store.maps;
  const groups = (state.ed ? [state.ed] : EDITIONS).map((e) => ({ label: 'KR' + e, e, ms: store.maps.filter((m) => m.ed === e) }));
  if (!state.ed) groups.push({ label: 'Total', ms: store.maps, total: true });
  const runners = runnerBoard(pool);
  const biggest = pool.filter((m) => m.gap < 0).sort((a, b) => a.gap - b.gap).slice(0, 10);

  $('#statsView').innerHTML = `
  <div class="scope" style="--c:${edColor(state.ed)}">${state.ed ? 'KR' + state.ed : 'All editions'}</div>
  <div class="panel"><h3>${state.ed ? 'Edition' : 'Editions'}</h3><div class="tw"><table><tr><th>Edition</th><th>TAS'd</th><th style="width:22%">Progress</th><th>%</th><th>TAS total</th><th>WR total</th><th>Saved</th><th>Normal cuts</th><th>Ubers</th><th>Noseboosts</th></tr>
  ${groups.map(editionRow).join('')}</table></div></div>
  <div class="two">
    <div class="panel"><h3>Ratings</h3><div class="tw"><table><tr><th>Edition</th>${RATINGS.map((r) => `<th>${r}</th>`).join('')}<th>Unrated</th><th>Score</th></tr>
    ${groups.map(ratingRow).join('')}</table></div><p class="note">Score: Great 100 · Good 75 · Okay 50 · Meh 25, averaged over rated TASes.</p></div>
    <div class="panel"><h3>Biggest timesaves</h3><div class="tw"><table><tr><th>Map</th><th>WR</th><th>TAS</th><th>Saved</th></tr>
    ${biggest.length ? biggest.map((m) => `<tr class="click" data-action="map" data-id="${m.id}"><td><b style="color:${edColor(m.ed)}">KR${m.ed}</b> #${m.id}</td><td class="mono">${fmt(m.wr.t)}</td><td class="mono" style="color:var(--acc2)">${fmt(m.best.t)}</td><td class="mono neg">${fmtGap(m.gap)}</td></tr>`).join('')
      : '<tr><td colspan="4" class="muted">No TAS faster than the WR yet.</td></tr>'}</table></div></div>
  </div>
  <div class="panel"><h3>Runners · ${runners.length}</h3>${runners.length ? '' : '<p class="muted">No TAS runs in this edition yet.</p>'}<div class="tw"><table><tr><th>#</th><th>Runner</th><th>TASes</th><th>Saved</th><th>Normal cuts</th><th>Ubers</th><th>Noseboosts</th><th>Avg score</th></tr>
  ${runners.map((r, i) => `<tr><td class="mono muted">${i + 1}</td><td><b>${playerLink(r.n)}</b></td><td class="mono">${r.ms.length}</td><td class="mono neg">${fmtGap(r.saved)}</td>
    ${CUTS.map((k) => `<td class="mono">${r.ms.filter((m) => m.cut === k).length}</td>`).join('')}<td class="mono">${score(r.ms)}</td></tr>`).join('')}</table></div></div>`;
}
