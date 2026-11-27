// Generates share pages with link-preview (Open Graph) tags, run at deploy time (not committed):
//   m/<map #>.html   -> preview: map thumbnail, best TAS vs WR      -> redirects to /#map-<#>
//   p/<slug>.html    -> preview: player's TAS count and time saved  -> redirects to /#player-<name>
// Discord, Twitter/X, WhatsApp etc. read these tags; people are sent straight to the real page.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fmt, esc, slug } from '../js/format.js';
import { toCsv } from './lib/csv.mjs';

const BASE = process.env.SITE_URL || 'https://kristiano55.github.io/Kacky-Reloaded-Project';
const rd = async (f, d) => { try { return JSON.parse(await readFile(f, 'utf8')); } catch { return d; } };
const maps = await rd('data/maps.json', []);
const wr = await rd('data/wr.json', {});
const tas = await rd('data/tas.json', {});
const COL = ['', '#ffffff', '#5bff8a', '#3da5ff', '#ff4d6d', '#b06bff', '#ffc83d', '#35e0ff'];

const gapTxt = (d) => (d < 0 ? '−' : '+') + fmt(Math.abs(d));

const page = ({ title, desc, image, color, target, self }) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Kacky Reloaded · TAS Project">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(self)}">
${image ? `<meta property="og:image" content="${esc(image)}">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:image" content="${esc(image)}">` : '<meta name="twitter:card" content="summary">'}
<meta name="theme-color" content="${color}">
<meta http-equiv="refresh" content="0; url=${esc(target)}">
<script>location.replace(${JSON.stringify(target)})</script>
</head><body style="background:#07080c;color:#e9ecf4;font-family:system-ui">
<p><a style="color:#c6ff3d" href="${esc(target)}">${esc(title)}</a></p></body></html>`;

await mkdir('m', { recursive: true });
await mkdir('p', { recursive: true });
const players = {};
for (const m of maps) {
  const w = wr[m.uid]?.t ? wr[m.uid] : null;
  const runs = (tas[m.uid] || []).slice().sort((a, b) => a.t - b.t);
  const best = runs[0];
  for (const [i, r] of runs.entries()) (players[r.by] ||= []).push({ m, r, top: i === 0, gap: w ? r.t - w.t : null });
  const desc = best
    ? `TAS ${fmt(best.t)} by ${best.by}${w ? ` (${gapTxt(best.t - w.t)} vs WR ${fmt(w.t)} by ${w.by})` : ''}` + (runs.length > 1 ? ` · ${runs.length} TAS runs` : '')
    : `No TAS yet · WR ${fmt(w?.t)}${w ? ` by ${w.by}` : ''} · author ${m.author}`;
  await writeFile(`m/${m.id}.html`, page({
    title: `KR${m.ed} #${m.id} · Kacky Reloaded TAS`, desc, image: m.thumb, color: COL[m.ed], target: `${BASE}/#map-${m.id}`, self: `${BASE}/m/${m.id}.html`,
  }));
}
for (const [name, list] of Object.entries(players)) {
  const tops = list.filter((x) => x.top);
  const saved = tops.reduce((s, x) => s + (x.gap ?? 0), 0);
  const best = tops.slice().sort((a, b) => (a.gap ?? 0) - (b.gap ?? 0))[0];
  const desc = `${tops.length} best TAS${tops.length === 1 ? '' : 'es'} · ${list.length} run${list.length === 1 ? '' : 's'}` +
    (saved ? ` · ${gapTxt(saved)} vs WR in total` : '') + (best?.gap ? ` · biggest: KR${best.m.ed} #${best.m.id} (${gapTxt(best.gap)})` : '');
  await writeFile(`p/${slug(name)}.html`, page({
    title: `${name} · Kacky Reloaded TAS`, desc, image: best?.m.thumb || tops[0]?.m.thumb, color: '#c6ff3d',
    target: `${BASE}/#player-${encodeURIComponent(name)}`, self: `${BASE}/p/${slug(name)}.html`,
  }));
}
console.log(`share pages: ${maps.length} maps, ${Object.keys(players).length} players`);

// ---- CSV feeds for the Google Sheet (IMPORTDATA), one row per map in map order ----
const classify = await rd('data/classify.json', {});
const videos = await rd('data/videos.json', []);
const core = [['#', 'Edition', 'Author', 'WR (s)', 'WR holder', 'Best TAS (s)', 'TAS by', 'Gap vs WR (s)']];
const extra = [['Status', 'Author time (s)', 'WR date', 'Map UID', 'Replay', 'Video outdated', 'Tags outdated', 'TAS runs']];
for (const m of maps) {
  const w = wr[m.uid]?.t ? wr[m.uid] : null;
  const runs = (tas[m.uid] || []).slice().sort((a, b) => a.t - b.t);
  const best = runs[0];
  const gap = best && w ? (best.t - w.t) / 1000 : null;
  core.push([m.id, 'KR' + m.ed, m.author, w ? w.t / 1000 : '', w?.by || '', best ? best.t / 1000 : '', best?.by || '', gap ?? '']);
  extra.push([
    !best ? 'No TAS' : gap != null && gap < 0 ? 'TAS < WR' : 'TAS > WR', m.at / 1000, w?.date || '', m.uid, best?.replay || '',
    videos.some((v) => v.map === m.id && v.outdated) ? 'TRUE' : 'FALSE', classify[m.uid]?.outdated ? 'TRUE' : 'FALSE', runs.length,
  ]);
}
await writeFile('data/sheet_core.csv', toCsv(core));
await writeFile('data/sheet_extra.csv', toCsv(extra));
console.log('sheet feeds: data/sheet_core.csv, data/sheet_extra.csv');
