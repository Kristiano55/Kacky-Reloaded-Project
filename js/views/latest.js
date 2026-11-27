// "Latest TASes" panel: the 5 newest uploads with a clip player.
import { esc, fmt, fmtGap, ago } from '../format.js';
import { latestRuns } from '../model.js';
import { $, store, state, edColor } from '../store.js';
import { playerLink, mapLabel, videoPlayer } from '../html.js';

let selected = null;
export function selectLatest(id) { selected = id; renderLatest(); }

export function renderLatest() {
  const L = latestRuns(store.maps, { ed: state.ed, dates: store.dates, videos: store.videos });
  if (!L.length) { $('#latest').innerHTML = ''; return; }
  if (!L.some((x) => x.r.id === selected)) selected = (L.find((x) => x.clip) || L[0]).r.id;
  const sel = L.find((x) => x.r.id === selected);
  const gap = (x) => (x.m.wr ? x.r.t - x.m.wr.t : null);

  const player = sel.clip
    ? videoPlayer(sel.clip.url, `Clip: KR${sel.m.ed} #${sel.m.id} by ${sel.r.by}`, { lazy: false, fallback: '▶ Watch clip' })
    : `<div class="noclip"><div class="big">${fmt(sel.r.t)}</div><div class="muted">No clip for this run yet. Add one in the sheet's Videos tab.</div>
        <div class="links" style="justify-content:center;margin-top:10px"><button class="btn pri" data-action="map" data-id="${sel.m.id}">Open map · Inputs</button><a class="btn" href="${esc(sel.r.replay)}">⬇ Replay</a></div></div>`;

  const item = (x) => {
    const d = gap(x), on = x.r.id === selected;
    return `<button class="lt-item ${on ? 'on' : ''}" aria-pressed="${on}" data-action="latest" data-id="${x.r.id}" style="--c:${edColor(x.m.ed)}">
      <span class="lt-map"><b>KR${x.m.ed}</b> #${x.m.id}</span>
      <span class="lt-who">${esc(x.r.by)}${x.rank === 1 ? ' <span class="tag r-great">#1</span>' : ''}</span>
      <span class="lt-time mono">${fmt(x.r.t)}</span>
      <span class="lt-gap mono ${d < 0 ? 'neg' : 'pos'}">${d == null ? '' : fmtGap(d)}</span>
      <span class="lt-meta">${x.clip ? '<span class="lt-clip">▶ clip</span>' : ''}<span class="muted">${ago(x.date)}</span></span>
    </button>`;
  };

  $('#latest').innerHTML = `
    <div class="lt-head"><h3>Latest TASes</h3><span class="muted">${state.ed ? 'KR' + state.ed : 'All editions'}</span></div>
    <div class="lt">
      <div class="lt-list">${L.map(item).join('')}</div>
      <div class="lt-player">
        <div class="vmedia">${player}</div>
        <div class="vmeta"><div>${mapLabel(sel.m)} · ${playerLink(sel.r.by)} · <span class="mono">${fmt(sel.r.t)}</span>${sel.clip?.title ? ' · ' + esc(sel.clip.title) : ''}</div>
          <div class="muted"><a href="#map-${sel.m.id}" data-action="map" data-id="${sel.m.id}">Open map</a>${sel.clip ? ` · <a href="${esc(sel.clip.url)}" target="_blank" rel="noopener">source ↗</a>` : ''}</div></div>
      </div>
    </div>`;
}
