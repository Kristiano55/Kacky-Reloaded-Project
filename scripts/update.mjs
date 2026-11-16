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

// 2. Human WRs from Trackmania.io (paced to respect rate limits)
const wr = await readJson('data/wr.json', {});
for (const m of maps) {
  try {
    const j = await tmio(`/leaderboard/${m.lb}/${m.uid}?offset=0&length=1`);
    const t = j.tops?.[0];
    if (t) wr[m.uid] = { t: t.time, by: t.player?.name, date: (t.timestamp || '').slice(0, 10) };
  } catch (e) { console.warn(e.message); }
  await sleep(700);
}
await writeFile('data/wr.json', JSON.stringify(wr));

// 3. TAS runs from TMTAS Exchange
const tas = {};
for (let i = 0; i < maps.length; i += 5) {
  await Promise.all(maps.slice(i, i + 5).map(async (m) => {
    const j = await fetch('https://tmtas.exchange/api/tick/leaderboard?map_uid=' + m.uid, { headers: { 'User-Agent': UA } })
      .then((r) => r.json()).catch(() => null);
    if (!j?.records?.length) return;
    const cats = Object.fromEntries((j.categories || []).map((c) => [c.id, c.name]));
    tas[m.uid] = j.records.map((r) => ({
      by: r.name, t: r.time_ms, replay: r.replay_url,
      id: Number(new URL(r.replay_url).searchParams.get('id')), cat: cats[r.category_id] || '',
    }));
  }));
  await sleep(300);
}
await writeFile('data/tas.json', JSON.stringify(tas));
await writeFile('data/updated.json', JSON.stringify({ at: new Date().toISOString() }));
console.log(`maps ${maps.length}, wrs ${Object.keys(wr).length}, maps with TAS ${Object.keys(tas).length}`);
