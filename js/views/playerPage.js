// Player profile (dialog): best TASes, time saved, cuts, per-edition bars, every run, videos, human WRs.
import { esc, fmt, fmtGap, score, slug } from '../format.js';
import { playerSummary } from '../model.js';
import { $, store, edColor, SITE } from '../store.js';
import { canGoBack } from '../router.js';
import { tags, videoCard, copyButton, pageButtons } from '../html.js';

const plural = (n, word, many = word + 's') => `${n} ${n === 1 ? word : many}`;

export function showPlayerPage(name) {
  const { runs, tops, wrs, saved, perEdition } = playerSummary(store.maps, name);
  const cuts = (k) => tops.filter((x) => x.m.cut === k).length;
  const maxEd = Math.max(1, ...perEdition.map((x) => x.n));
  const videos = store.videos.filter((x) => x.runner && x.runner.toLowerCase() === name.toLowerCase());

  const runRow = (x) => {
    const g = x.m.wr ? x.r.t - x.m.wr.t : null;
    return `<tr class="click" data-action="map" data-id="${x.m.id}"><td><b style="color:${edColor(x.m.ed)}">KR${x.m.ed}</b> #${x.m.id}</td>
      <td class="mono">${fmt(x.r.t)}</td><td class="mono">${x.rank === 1 ? '<span class="tag r-great">#1</span>' : '#' + x.rank}</td>
      <td class="mono ${g < 0 ? 'neg' : 'pos'}">${g == null ? '—' : fmtGap(g)}</td><td>${tags(x.m, 'margin:0')}</td></tr>`;
  };

  $('#m-body').innerHTML = `
  <div class="m-head phead">
    ${pageButtons(canGoBack())}
    <div class="t"><div class="avatar">${esc(name.slice(0, 1).toUpperCase())}</div>
      <h2>${esc(name)} ${copyButton(`${SITE}/p/${slug(name)}.html`, '🔗 Copy link', { style: 'vertical-align:middle;font-style:normal' })}</h2>
      <p>${plural(tops.length, 'best TAS', 'best TASes')} · ${plural(runs.length, 'run')} uploaded${wrs.length ? ` · holds ${plural(wrs.length, 'human WR')}` : ''}</p></div>
  </div>
  <div class="m-sec"><div class="pstats">
    <div class="box"><div class="l">Best TASes</div><div class="big">${tops.length}</div></div>
    <div class="box"><div class="l">Time saved vs WR</div><div class="big neg">${saved ? fmtGap(saved) : '—'}</div></div>
    <div class="box"><div class="l">Beats WR</div><div class="big">${tops.filter((x) => x.m.gap < 0).length}</div></div>
    <div class="box"><div class="l">Avg score</div><div class="big">${score(tops.map((x) => x.m))}</div></div>
  </div>
  <div class="tags" style="margin-top:12px"><span class="tag cut-normal">${cuts('Normal cut')} Normal cuts</span><span class="tag cut-uber">${cuts('Uber')} Ubers</span><span class="tag cut-noseboost">${cuts('Noseboost')} Noseboosts</span></div>
  </div>
  ${perEdition.length ? `<div class="m-sec"><h3>By edition</h3>${perEdition.map((x) => `<div class="edbar"><b style="color:${edColor(x.e)}">KR${x.e}</b><div class="meter" style="--c:${edColor(x.e)}"><i style="width:${(x.n / maxEd) * 100}%"></i></div><span class="mono">${x.n}</span></div>`).join('')}</div>` : ''}
  <div class="m-sec"><h3>TAS runs</h3>${runs.length ? `<div class="tw"><table><tr><th>Map</th><th>Time</th><th>Rank</th><th>vs WR</th><th></th></tr>${runs.map(runRow).join('')}</table></div>` : '<p class="muted">No TAS runs.</p>'}</div>
  ${videos.length ? `<div class="m-sec"><h3>Videos</h3><div class="vgrid one">${videos.map(videoCard).join('')}</div></div>` : ''}
  ${wrs.length ? `<div class="m-sec"><h3>Human world records</h3><div class="links">${wrs.map((m) => `<button class="btn" data-action="map" data-id="${m.id}">KR${m.ed} #${m.id} · ${fmt(m.wr.t)}</button>`).join('')}</div></div>` : ''}`;
  const dlg = $('#modal');
  if (!dlg.open) dlg.showModal();
  $('#m-body').scrollTop = 0;
}
