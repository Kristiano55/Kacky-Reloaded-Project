import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMaps, filterMaps, latestRuns, clipFor, playerSummary, runnerBoard } from '../js/model.js';

const raw = {
  maps: [
    { id: 1, ed: 1, uid: 'u1', name: 'Kacky Reloaded #1', author: 'a1' },
    { id: 2, ed: 1, uid: 'u2', name: 'Kacky Reloaded #2', author: 'a2' },
    { id: 76, ed: 2, uid: 'u76', name: 'Kacky Reloaded #76', author: 'a3' },
  ],
  wr: { u1: { t: 14168, by: 'Arne' }, u2: { t: 9000, by: 'Zed' }, u76: { t: 20000, by: 'Arne' } },
  tas: {
    u1: [{ by: 'Vito', t: 13788, id: 10 }, { by: 'Elliott', t: 8055, id: 12 }],
    u76: [{ by: 'Elliott', t: 15000, id: 11 }],
  },
  classify: { u1: { cut: 'Noseboost', rating: 'Good' }, u76: { cut: 'Uber', rating: 'Meh', outdated: true } },
};
const maps = buildMaps(raw);
const byId = (id) => maps.find((m) => m.id === id);

test('buildMaps sorts runs, computes the gap and applies tags', () => {
  assert.deepEqual(byId(1).runs.map((r) => r.by), ['Elliott', 'Vito']);
  assert.equal(byId(1).gap, 8055 - 14168);
  assert.equal(byId(1).cut, 'Noseboost');
  assert.equal(byId(2).best, undefined);
  assert.equal(byId(2).gap, null);
});

test('outdated tags are ignored', () => {
  assert.equal(byId(76).cut, '');
  assert.equal(byId(76).rating, '');
});

test('filterMaps: edition, search, filters and sorts', () => {
  assert.deepEqual(filterMaps(maps, { ed: 2 }).map((m) => m.id), [76]);
  assert.deepEqual(filterMaps(maps, { q: 'elliott' }).map((m) => m.id), [1, 76]);
  assert.deepEqual(filterMaps(maps, { filter: 'none' }).map((m) => m.id), [2]);
  assert.deepEqual(filterMaps(maps, { filter: 'Noseboost' }).map((m) => m.id), [1]);
  assert.deepEqual(filterMaps(maps, { sort: 'gap' }).map((m) => m.id), [1, 76, 2]);
  assert.deepEqual(filterMaps(maps, { filter: 'nonsense', sort: 'nonsense' }).map((m) => m.id), [1, 2, 76]);
});

test('latestRuns orders by upload date, then replay id', () => {
  assert.deepEqual(latestRuns(maps).map((x) => x.r.id), [12, 11, 10]);
  assert.deepEqual(latestRuns(maps, { dates: { 10: 999 } }).map((x) => x.r.id), [10, 12, 11]);
  assert.equal(latestRuns(maps, { n: 1 }).length, 1);
});

test('clipFor matches a video to the run it was added for', () => {
  const videos = [{ map: 1, url: 'v-old', forTas: 13.788 }, { map: 1, url: 'v-new', forTas: 8.055 }];
  assert.equal(clipFor(byId(1), byId(1).runs[0], videos).url, 'v-new');
  assert.equal(clipFor(byId(1), byId(1).runs[1], videos).url, 'v-old');
  assert.equal(clipFor(byId(76), byId(76).runs[0], videos), null);
});

test('playerSummary and runnerBoard', () => {
  const s = playerSummary(maps, 'Elliott');
  assert.equal(s.tops.length, 2);
  assert.equal(s.saved, (8055 - 14168) + (15000 - 20000));
  assert.deepEqual(s.perEdition, [{ e: 1, n: 1 }, { e: 2, n: 1 }]);
  assert.deepEqual(playerSummary(maps, 'Arne').wrs.map((m) => m.id), [1, 76]);
  assert.deepEqual(runnerBoard(maps).map((r) => r.n), ['Elliott']);
});
