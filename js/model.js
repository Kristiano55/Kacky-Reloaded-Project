// Data model: turns the JSON files in data/ into map objects, and answers questions about them.
// Pure functions (no DOM), so they can be tested with `node --test`.

export const EDITIONS = [1, 2, 3, 4, 5, 6, 7];
export const CUTS = ['Normal cut', 'Uber', 'Noseboost'];

/**
 * Combine data/*.json into one list of maps:
 * { ...map, wr, runs (fastest first), best, gap (ms, negative = TAS faster), cut, rating }
 * Tags flagged `outdated` (a faster TAS replaced the tagged run) are ignored.
 */
export function buildMaps({ maps = [], wr = {}, tas = {}, classify = {} }) {
  return maps.map((m) => {
    const runs = (tas[m.uid] || []).slice().sort((a, b) => a.t - b.t);
    const best = runs[0];
    const w = wr[m.uid]?.t ? wr[m.uid] : undefined;
    const c = classify[m.uid]?.outdated ? {} : classify[m.uid] || {};
    return { ...m, wr: w, runs, best, gap: best && w ? best.t - w.t : null, cut: c.cut || '', rating: c.rating || '' };
  });
}

/** Apply the edition / search / filter / sort controls. Returns a new array. */
export function filterMaps(maps, { ed = 0, q = '', filter = 'all', sort = 'id' } = {}) {
  let list = maps.filter((m) => !ed || m.ed === ed);
  if (q) list = list.filter((m) => [m.id, m.name, m.author, m.wr?.by, ...m.runs.map((r) => r.by)].join(' ').toLowerCase().includes(q));
  const keep = {
    tas: (m) => m.best,
    none: (m) => !m.best,
    beat: (m) => m.gap < 0,
    behind: (m) => m.gap > 0,
    unrated: (m) => m.best && !m.rating,
  }[filter] || (CUTS.includes(filter) ? (m) => m.cut === filter : null);
  if (keep) list = list.filter(keep);
  const order = {
    id: (a, b) => a.id - b.id,
    gap: (a, b) => (a.gap ?? 1e12) - (b.gap ?? 1e12),
    wr: (a, b) => (a.wr?.t ?? 1e12) - (b.wr?.t ?? 1e12),
    recent: (a, b) => (b.wr?.date || '').localeCompare(a.wr?.date || ''),
  }[sort] || ((a, b) => a.id - b.id);
  return list.sort(order);
}

/** The clip for a run: a video added while that exact time was the map's best. */
export function clipFor(m, r, videos) {
  const v = videos.filter((x) => x.map === m.id);
  return v.find((x) => x.forTas != null && Math.abs(x.forTas - r.t / 1000) < 0.0005)
    || (m.best && m.best.id === r.id ? v.find((x) => !x.outdated && x.forTas == null) : null)
    || null;
}

/** The newest TAS uploads (by upload date, then replay id). */
export function latestRuns(maps, { ed = 0, dates = {}, videos = [], n = 5 } = {}) {
  return maps.filter((m) => !ed || m.ed === ed)
    .flatMap((m) => m.runs.map((r, i) => ({ m, r, rank: i + 1 })))
    .sort((a, b) => (dates[b.r.id] || 0) - (dates[a.r.id] || 0) || b.r.id - a.r.id)
    .slice(0, n)
    .map((x) => ({ ...x, clip: clipFor(x.m, x.r, videos), date: dates[x.r.id] }));
}

/** Everything a player has done: all their runs (with rank on the map), best TASes and human WRs. */
export function playerSummary(maps, name) {
  const runs = [];
  maps.forEach((m) => m.runs.forEach((r, i) => { if (r.by === name) runs.push({ m, r, rank: i + 1 }); }));
  runs.sort((a, b) => a.m.id - b.m.id);
  const tops = runs.filter((x) => x.rank === 1);
  return {
    runs, tops,
    wrs: maps.filter((m) => m.wr?.by === name),
    saved: tops.reduce((s, x) => s + (x.m.gap ?? 0), 0),
    perEdition: EDITIONS.map((e) => ({ e, n: tops.filter((x) => x.m.ed === e).length })).filter((x) => x.n),
  };
}

/** Runner leaderboard: most best-TASes first, then most time saved. */
export function runnerBoard(maps) {
  const by = {};
  maps.filter((m) => m.best).forEach((m) => (by[m.best.by] ||= []).push(m));
  return Object.entries(by).map(([n, ms]) => ({ n, ms, saved: ms.reduce((s, m) => s + (m.gap ?? 0), 0) }))
    .sort((a, b) => b.ms.length - a.ms.length || a.saved - b.saved);
}
