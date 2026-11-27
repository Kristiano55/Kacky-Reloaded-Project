// The map grid on the main page.
import { esc, fmt, fmtGap } from '../format.js';
import { filterMaps } from '../model.js';
import { $, store, state, edColor } from '../store.js';
import { tags } from '../html.js';

/** Small 640×180 WebP made by the data job when available; the 1024×1024 original otherwise. */
const thumbUrl = (m) => (m.ts ? `thumbs/${m.id}.webp` : m.thumb);

function card(m) {
  const badge = m.gap < 0 ? '<span class="badge beat">TAS &lt; WR</span>' : m.best ? '<span class="badge tas">TAS</span>' : '<span class="badge">No TAS</span>';
  const delta = m.gap == null ? (m.best ? 'no WR data' : 'Waiting for a TAS') : fmtGap(m.gap) + ' vs WR';
  return `<button class="card" data-action="map" data-id="${m.id}" style="--c:${edColor(m.ed)}">
    <div class="thumb" ${thumbUrl(m) ? `data-bg="${esc(thumbUrl(m))}"` : ''}><div class="num"><small>KR${m.ed}</small>#${m.id}</div>${badge}</div>
    <div class="cb"><div class="au">by ${esc(m.author || 'unknown')}</div>
      <div class="rows">
        <div class="r"><span class="k">WR</span><span class="v">${fmt(m.wr?.t)}</span><span class="w">${esc(m.wr?.by || '')}</span></div>
        <div class="r"><span class="k">TAS</span><span class="v" style="color:var(--acc2)">${fmt(m.best?.t)}</span><span class="w">${esc(m.best?.by || '')}</span></div>
      </div>
      ${tags(m)}<div class="delta ${m.gap == null ? 'muted' : m.gap < 0 ? 'neg' : 'pos'}">${delta}</div>
    </div></button>`;
}

export function renderGrid() {
  const list = filterMaps(store.maps, state);
  $('#empty').hidden = list.length > 0;
  $('#grid').innerHTML = list.map(card).join('');
  lazyThumbs();
}

// Thumbnails load only when a card scrolls near the screen (525 images otherwise).
const observer = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { show(e.target); observer.unobserve(e.target); }
}, { rootMargin: '600px 0px' }) : null;
const show = (el) => { el.style.backgroundImage = `url('${el.dataset.bg}')`; };
function lazyThumbs() {
  document.querySelectorAll('#grid .thumb[data-bg]').forEach((el) => (observer ? observer.observe(el) : show(el)));
}
