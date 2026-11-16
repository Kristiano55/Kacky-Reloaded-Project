// Two-way sync between the repo data and the "Kacky Reloaded TAS Project" sheet.
//
//   node scripts/sheet_sync.mjs <sheet.json>
//
// <sheet.json> holds what the sheet's people edit (read from the sheet first):
//   { "tags":   { "<map #>": ["<Cut>", "<Rating>"], ... },        // Maps!I:J, non-empty rows only
//     "videos": [ [<sheet row>, "<map # or blank>", "<link>", "<title>", "<runner>"], ... ] }
//                 // Videos!A:F rows that have a link: row, A (map #), E (link), F (title), D (TAS by / runner)
//
// Writes:
//   data/classify.json, data/videos.json      -> what the website reads
//   sync/edits.json                           -> sheet edits (applyEdits payload "edits" lists, in parts)
//   sync/sheet_state.json                     -> what the sheet's data columns hold after those edits,
//                                                plus which TAS each video was added for (to flag outdated videos)
//
// Sheet Maps columns: A # | B Edition | C Author | D WR | E WR holder | F Best TAS | G TAS by | H Gap
//                     | I Cut | J Rating | K Status | L Author time | M WR date | N Map UID | O Replay
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const rd = async (f, d) => { try { return JSON.parse(await readFile(f, 'utf8')); } catch { return d; } };
const sheet = await rd(process.argv[2] || 'sync/sheet.json', { tags: {}, videos: [] });
const maps = await rd('data/maps.json', []);
const wr = await rd('data/wr.json', {});
const tas = await rd('data/tas.json', {});
const saved = await rd('sync/sheet_state.json', {});
const state = saved.maps || (saved.videos ? {} : saved); // old files held only the map rows
const vstate = saved.videos || {};

const sec = (ms) => (ms == null ? null : Math.round(ms) / 1000);
const next = {};
const changed = [];
const tasChanged = new Set();
for (const m of maps) {
  const w = wr[m.uid]?.t ? wr[m.uid] : null;
  const best = (tas[m.uid] || []).slice().sort((a, b) => a.t - b.t)[0] || null;
  const gap = best && w ? Math.round(best.t - w.t) / 1000 : null;
  const row = {
    wr: sec(w?.t), wrBy: w?.by ?? null, tas: sec(best?.t), tasBy: best?.by ?? null, gap,
    status: !best ? 'No TAS' : gap != null && gap < 0 ? 'TAS < WR' : 'TAS > WR',
    date: w?.date || null, replay: best?.replay || null,
  };
  next[m.id] = row;
  const old = state[m.id];
  if (!old || JSON.stringify(old) !== JSON.stringify(row)) changed.push(m.id);
  if (old && (old.tas !== row.tas || old.tasBy !== row.tasBy)) tasChanged.add(m.id);
}

// Tags belong to the best TAS: when it changes, the old tags are cleared.
const tags = {};
for (const [id, v] of Object.entries(sheet.tags || {})) if (!tasChanged.has(+id)) tags[id] = v;

const edits = changed.flatMap((id) => {
  const r = next[id], n = id + 1, t = tags[id] || [null, null];
  return [
    { kind: 'writeCells', sheet: 'Maps', topLeft: `D${n}`, rows: [[r.wr, r.wrBy, r.tas, r.tasBy, r.gap, t[0] || null, t[1] || null, r.status]] },
    { kind: 'writeCells', sheet: 'Maps', topLeft: `M${n}`, rows: [[r.date, maps.find((m) => m.id === id).uid, r.replay]] },
  ];
});
// Videos: remember which TAS each video was added for; paint the link red once a faster TAS replaces it.
const nextV = {};
const videos = [];
for (const v of sheet.videos || []) {
  const [row, map, link, title, runner] = v;
  const url = String(link || '').trim();
  if (!/^https?:\/\//.test(url)) continue;
  const mapId = Number(String(map ?? '').replace('#', '')) || null;
  const curTas = mapId ? next[mapId]?.tas ?? null : null;
  const prev = vstate[row];
  let entry;
  if (!prev || prev.url !== url) {
    entry = { url, forTas: curTas, outdated: false, runner: runner ? String(runner) : '' };
    if (prev?.outdated) edits.push({ kind: 'formatCells', sheet: 'Videos', ranges: [`E${row}:F${row}`], format: { fillColor: { kind: 'none' } } });
  } else {
    const outdated = prev.outdated || (mapId != null && prev.forTas !== curTas);
    entry = { ...prev, outdated };
    if (outdated && !prev.outdated) edits.push({ kind: 'formatCells', sheet: 'Videos', ranges: [`E${row}:F${row}`], format: { fillColor: { kind: 'standard', hue: 'red', shade: 200 } } });
  }
  nextV[row] = entry;
  videos.push({ map: mapId, url, title: title ? String(title) : '', runner: entry.runner ?? (runner ? String(runner) : ''), outdated: entry.outdated, forTas: entry.forTas });
}

const parts = [];
for (let i = 0; i < edits.length; i += 60) parts.push(edits.slice(i, i + 60));

// Website files
const classify = {};
for (const [id, [cut, rating]] of Object.entries(tags)) {
  const m = maps.find((x) => x.id === +id);
  if (m && (cut || rating)) classify[m.uid] = { cut: cut || '', rating: rating || '' };
}

await mkdir('sync', { recursive: true });
await writeFile('data/classify.json', JSON.stringify(classify, null, 1));
await writeFile('data/videos.json', JSON.stringify(videos, null, 1));
await writeFile('sync/edits.json', JSON.stringify(parts));
await writeFile('sync/sheet_state.json', JSON.stringify({ maps: next, videos: nextV }));
console.log(JSON.stringify({
  rowsToUpdate: changed.length, editParts: parts.length,
  tagsClearedBecauseNewTAS: [...tasChanged].filter((id) => sheet.tags?.[id]),
  classified: Object.keys(classify).length, videos: videos.length, outdatedVideos: videos.filter((v) => v.outdated).length,
}));
