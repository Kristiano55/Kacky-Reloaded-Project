// Small HTML building blocks shared by the views.
// Interactivity uses data attributes handled in main.js (data-action / data-player) — never inline JS,
// because names and links come from outside sources.
import { esc } from './format.js';
import { embed } from './embed.js';
import { edColor, mapById } from './store.js';

/** Link to a player profile. */
export const playerLink = (n) => (n ? `<a class="plink" href="#player-${encodeURIComponent(n)}" data-player="${esc(n)}">${esc(n)}</a>` : '');

/** Coloured "KR4 #231" label that opens the map. */
export const mapLabel = (m) => `<a href="#map-${m.id}" data-action="map" data-id="${m.id}" style="color:${edColor(m.ed)}"><b>KR${m.ed}</b> #${m.id}</a>`;

/** Button that copies text to the clipboard. */
export const copyButton = (text, label, { cls = 'btn', title = '', style = '' } = {}) =>
  `<button class="${cls}" data-action="copy" data-text="${esc(text)}"${title ? ` title="${esc(title)}"` : ''}${style ? ` style="${style}"` : ''}>${label}</button>`;

/** Cut + rating badges for a map. */
export function tags(m, style = '') {
  const t = [];
  if (m.cut && m.cut !== 'No cut') t.push(`<span class="tag cut-${m.cut.split(' ')[0].toLowerCase()}">${esc(m.cut)}</span>`);
  if (m.rating) t.push(`<span class="tag r-${m.rating.toLowerCase()}">${esc(m.rating)}</span>`);
  return t.length ? `<div class="tags" ${style ? `style="${style}"` : ''}>${t.join('')}</div>` : '';
}

/** Embedded player for a video link, or a plain link when the site can't be embedded. */
export function videoPlayer(url, title, { lazy = true, fallback = '▶ Open video' } = {}) {
  const e = embed(url, location.hostname || 'localhost');
  if (!e) return `<a class="vlink" href="${esc(url)}" target="_blank" rel="noopener">${fallback}</a>`;
  if (e.kind === 'video') return `<video src="${esc(e.src)}" controls preload="metadata" title="${esc(title)}"></video>`;
  return `<iframe src="${esc(e.src)}" title="${esc(title)}" ${lazy ? 'loading="lazy"' : ''} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
}

/** Video card used on map pages, profiles and the Videos view. */
export function videoCard(v) {
  const m = v.map ? mapById(v.map) : null;
  const name = v.title || (m ? `KR${m.ed} #${m.id}` : 'Video');
  const older = v.outdated ? ` <span class="tag r-meh" title="A faster TAS has been uploaded since this video">Older run${v.forTas ? ' · ' + v.forTas.toFixed(3) : ''}</span>` : '';
  return `<div class="vcard"><div class="vmedia">${videoPlayer(v.url, name)}</div><div class="vmeta">
    <div><b>${esc(name)}</b>${older}</div>
    <div class="muted">${m ? mapLabel(m) : 'Compilation'}${v.runner ? ' · ' + playerLink(v.runner) : ''} · <a href="${esc(v.url)}" target="_blank" rel="noopener">source ↗</a></div></div></div>`;
}

/** Close and (when there's history to go back to) Back buttons for the map/profile pages. */
export const pageButtons = (showBack) =>
  `<button class="x" data-action="close" aria-label="Close">✕</button>${showBack ? '<button class="back" data-action="back" aria-label="Back">← Back</button>' : ''}`;
