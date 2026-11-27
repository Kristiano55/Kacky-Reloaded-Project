// Reads the people-edited columns of the Google Sheet tracker and turns them into site data.
// Runs in the 30-minute data job; no Claude, no Google credentials (the sheet is link-viewable,
// read through its CSV export).
//
//   Maps tab:          # | ...imported data... | Cut | Rating | Video link | Video title
//   Compilations tab:  Map # | Runner | Video link | Title
//
// Writes data/classify.json and data/videos.json. Each tag and each map video remembers which
// best-TAS time it was added for; once a faster TAS replaces it, it's flagged outdated
// (the sheet paints it red via the "outdated" columns of data/sheet_extra.csv).
import { readFile, writeFile } from 'node:fs/promises';

const rd = async (f, d) => { try { return JSON.parse(await readFile(f, 'utf8')); } catch { return d; } };
const cfg = await rd('data/gsheet.json', null);
if (!cfg?.id) { console.log('gsheet: no data/gsheet.json, skipping'); process.exit(0); }

function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
async function tab(gid) {
  const url = `https://docs.google.com/spreadsheets/d/${cfg.id}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { redirect: 'follow' });
  const text = await res.text();
  if (!res.ok || /^\s*<(!doctype|html)/i.test(text)) throw new Error(`sheet tab ${gid}: HTTP ${res.status} (is the sheet shared "anyone with the link can view"?)`);
  const [head, ...rows] = parseCsv(text);
  const ix = (name) => head.findIndex((h) => h.trim().toLowerCase() === name.toLowerCase());
  return { rows, ix };
}

let maps, comp;
try { maps = await tab(cfg.mapsGid); comp = cfg.compGid != null ? await tab(cfg.compGid) : null; }
catch (e) { console.warn('gsheet: ' + e.message + ' — keeping previous tags/videos'); process.exit(0); }

const mapList = await rd('data/maps.json', []);
const tas = await rd('data/tas.json', {});
const prevCls = await rd('data/classify.json', {});
const prevVid = await rd('data/videos.json', []);
const byId = Object.fromEntries(mapList.map((m) => [m.id, m]));
const bestSec = (m) => { const r = (tas[m.uid] || []).slice().sort((a, b) => a.t - b.t)[0]; return r ? r.t / 1000 : null; };
const S = (v) => String(v ?? '').trim();

const iNum = maps.ix('#'), iCut = maps.ix('Cut'), iRate = maps.ix('Rating'), iLink = maps.ix('Video link'), iTitle = maps.ix('Video title'), iBy = maps.ix('TAS by');
const classify = {}, videos = [];
for (const r of maps.rows) {
  const m = byId[Number(S(r[iNum]))];
  if (!m) continue;
  const cur = bestSec(m);
  const cut = S(r[iCut]), rating = S(r[iRate]);
  if (cut || rating) {
    const p = prevCls[m.uid];
    const same = p && p.cut === cut && p.rating === rating;
    const forTas = same && p.forTas !== undefined ? p.forTas : cur; // new/changed tag = about the current TAS
    classify[m.uid] = { cut, rating, forTas, outdated: forTas != null && cur != null && forTas !== cur };
  }
  const url = S(r[iLink]);
  if (/^https?:\/\//.test(url)) {
    const p = prevVid.find((v) => v.map === m.id && v.url === url);
    const forTas = p ? p.forTas : cur;
    videos.push({ map: m.id, url, title: S(r[iTitle]), runner: p?.runner || S(r[iBy]), forTas, outdated: forTas != null && cur != null && forTas !== cur });
  }
}
if (comp) {
  const cMap = comp.ix('Map #'), cBy = comp.ix('Runner'), cLink = comp.ix('Video link'), cTitle = comp.ix('Title');
  for (const r of comp.rows) {
    const url = S(r[cLink]);
    if (!/^https?:\/\//.test(url)) continue;
    videos.push({ map: Number(S(r[cMap]).replace('#', '')) || null, url, title: S(r[cTitle]), runner: S(r[cBy]), forTas: null, outdated: false });
  }
}
await writeFile('data/classify.json', JSON.stringify(classify, null, 1));
await writeFile('data/videos.json', JSON.stringify(videos, null, 1));
console.log(`gsheet: ${Object.keys(classify).length} tagged (${Object.values(classify).filter((c) => c.outdated).length} outdated), ${videos.length} videos (${videos.filter((v) => v.outdated).length} outdated)`);
