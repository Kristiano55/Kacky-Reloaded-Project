// Refreshes data/maps.json, data/wr.json and data/tas.json.
// Sources: Trackmania.io (maps + human world records) and TMTAS Exchange (TAS runs).
// Run: node scripts/update.mjs   (Node 18+)
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const UA = 'KackyReloadedProject/1.0 (github.com/Kacky-Reloaded-Project; TAS tracker)';
const CLUB = 3074;
const CAMPAIGNS = {
  1: [4398, 4399, 4400], 2: [13182, 13183, 13184], 3: [29580, 29581, 29583],
  4: [50111, 50112, 50113], 5: [81240, 81241, 81242], 6: [114976, 114977, 114978],
  7: [164289, 164293, 164294],
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (s) => (s || '').replace(/\$([0-9a-f]{3}|[a-z$<>])/gi, '').trim();

async function tmio(path, tries = 8) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch('https://trackmania.io/api' + path, { headers: { 'User-Agent': UA } });
    if (res.status === 429) { // rate limited: wait exactly as long as the API asks
      await sleep((Number(res.headers.get('retry-after')) || 10) * 1000 + 500);
      continue;
    }
    const j = await res.json().catch(() => ({}));
    if (!j.error) return j;
    await sleep(5000);
  }
  throw new Error('tm.io failed ' + path);
}

async function readJson(f, d) { try { return JSON.parse(await readFile(f, 'utf8')); } catch { return d; } }

await mkdir('data', { recursive: true });

// 1. Maps (only re-fetched if missing or with --maps)
let maps = await readJson('data/maps.json', []);
if (!maps.length || !('thumb' in maps[0]) || process.argv.includes('--maps')) {
  maps = [];
  for (const ed in CAMPAIGNS) {
    for (let p = 0; p < 3; p++) {
      const id = CAMPAIGNS[ed][p];
      const c = await tmio(`/campaign/${CLUB}/${id}`);
      c.playlist.forEach((m, i) => maps.push({
        id: (ed - 1) * 75 + p * 25 + i + 1, ed: +ed, part: p + 1, uid: m.mapUid,
        name: strip(m.name), author: m.authorplayer?.name || '', at: m.authorScore,
        lb: c.leaderboarduid, campaign: id, thumb: m.thumbnailUrl || '',
      }));
      await sleep(1500);
    }
  }
  await writeFile('data/maps.json', JSON.stringify(maps, null, 1));
}

// 2. TAS runs from TMTAS Exchange — incremental to keep requests minimal:
//    1 request lists uploads since the last check; only maps with new uploads are re-fetched.
//    A full 525-map sweep runs once a day as a safety net (deleted/edited runs).
const TMTAS = 'https://tmtas.exchange/api';
const tget = (path) => fetch(TMTAS + path, { headers: { 'User-Agent': UA } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const tstate = await readJson('data/tmtas_state.json', { lastCheck: 0, lastFull: 0, tracks: {} });
const tas = await readJson('data/tas.json', {});
const byId = Object.fromEntries(maps.map((m) => [m.id, m]));
const dates = await readJson('data/tas_dates.json', {}); // replay id -> upload time (unix s), for "latest TASes"
let requests = 0;

async function fetchMapTas(m) {
  requests++;
  const j = await tget('/tick/leaderboard?map_uid=' + m.uid);
  if (!j) return false;
  const cats = Object.fromEntries((j.categories || []).map((c) => [c.id, c.name]));
  const runs = (j.records || []).map((r) => ({
    by: r.name, t: r.time_ms, replay: r.replay_url,
    id: Number(new URL(r.replay_url).searchParams.get('id')), cat: cats[r.category_id] || '',
  }));
  if (runs.length) tas[m.uid] = runs; else delete tas[m.uid];
  return true;
}

// TMTAS track id -> map # ("Kacky Reloaded #123"), refreshed only when an unknown track shows up
async function refreshTracks() {
  for (let from = 1; from < 2000; from += 50) {
    requests++;
    const j = await tget(`/tracks?exchange=tm2020&name=${encodeURIComponent('Kacky Reloaded')}&amount=50&fromResultIndex=${from}`);
    const res = j?.results || [];
    for (const t of res) {
      const n = Number(String(t.track_name || '').match(/Kacky Reloaded #(\d+)\s*$/i)?.[1]);
      if (byId[n]) tstate.tracks[t.track_id] = n;
    }
    if (res.length < 50 || from + 50 > (j?.total || 0)) break;
  }
}

const now = Math.floor(Date.now() / 1000);
const full = process.argv.includes('--full-tas') || now - tstate.lastFull > 86400 || !tstate.lastCheck;
if (full) {
  for (let i = 0; i < maps.length; i += 8) { await Promise.all(maps.slice(i, i + 8).map(fetchMapTas)); await sleep(150); }
  tstate.lastFull = now;
  console.log('TAS: full sweep');
} else {
  requests++;
  const recent = (await tget(`/replays?minDate=${tstate.lastCheck - 900}`)) || [];
  for (const r of recent) dates[r.id] = r.date;
  const known = new Set(Object.values(tas).flat().map((r) => r.id));
  const fresh = recent.filter((r) => !known.has(r.id));
  if (fresh.some((r) => !(r.track_id in tstate.tracks))) {
    await refreshTracks();
    // anything still unknown is not a Kacky Reloaded map: remember that too
    for (const r of fresh) if (!(r.track_id in tstate.tracks)) tstate.tracks[r.track_id] = 0;
  }
  const ids = [...new Set(fresh.map((r) => tstate.tracks[r.track_id]).filter(Boolean))];
  for (const id of ids) await fetchMapTas(byId[id]);
  console.log(`TAS: ${fresh.length} new uploads, ${ids.length} Kacky maps re-checked`);
}
// Upload dates for runs we don't have one for yet (1 request, at most once every 6 h)
const undated = Object.values(tas).flat().filter((r) => !dates[r.id]);
if (undated.length && now - (tstate.datesTried || 0) > 6 * 3600) {
  requests++;
  const minId = Math.min(...undated.map((r) => r.id));
  const list = (await tget(`/replays?minDate=${now - 180 * 86400}`)) || [];
  for (const r of list) if (r.id >= minId) dates[r.id] = r.date;
  tstate.datesTried = now;
}
await writeFile('data/tas_dates.json', JSON.stringify(dates));
tstate.lastCheck = now;
await writeFile('data/tas.json', JSON.stringify(tas));
await writeFile('data/tmtas_state.json', JSON.stringify(tstate));
console.log(`TAS: ${Object.keys(tas).length} maps with runs, ${requests} TMTAS requests this run`);

// 3. Human WRs from Trackmania.io — rate limited, so each run gets a time budget
//    and refreshes the maps that were checked longest ago first.
const BUDGET = Number(process.env.WR_BUDGET_MIN || 10) * 60_000;
const wr = await readJson('data/wr.json', {});
const queue = maps.slice().sort((a, b) => (wr[a.uid]?.c || 0) - (wr[b.uid]?.c || 0));
const t0 = Date.now();
let checked = 0;
for (const m of queue) {
  if (Date.now() - t0 > BUDGET) break;
  try {
    const j = await tmio(`/leaderboard/${m.lb}/${m.uid}?offset=0&length=1`);
    const t = j.tops?.[0];
    if (t) wr[m.uid] = { t: t.time, by: t.player?.name, date: (t.timestamp || '').slice(0, 10), c: Date.now() };
    else wr[m.uid] = { ...(wr[m.uid] || {}), c: Date.now() };
    checked++;
  } catch (e) { console.warn(e.message); }
  await sleep(700);
}
await writeFile('data/wr.json', JSON.stringify(wr));
console.log(`WR: refreshed ${checked}/${maps.length} (oldest first) in ${Math.round((Date.now() - t0) / 1000)}s`);
await writeFile('data/updated.json', JSON.stringify({ at: new Date().toISOString() }));
