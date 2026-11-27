// End-to-end runs of the data scripts in a temporary folder with small fixtures.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { toCsv } from '../scripts/lib/csv.mjs';

const ROOT = resolve(import.meta.dirname, '..');
const MOCK = join(ROOT, 'tests/helpers/mock-fetch.mjs');

function workspace(files) {
  const dir = mkdtempSync(join(tmpdir(), 'kacky-'));
  mkdirSync(join(dir, 'data'));
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), typeof content === 'string' ? content : JSON.stringify(content));
  return dir;
}
const run = (dir, script, env = {}) => execFileSync(process.execPath, ['--import', MOCK, join(ROOT, script)], { cwd: dir, env: { ...process.env, ...env }, encoding: 'utf8' });
const json = (dir, f) => JSON.parse(readFileSync(join(dir, f), 'utf8'));

const maps = [
  { id: 1, ed: 1, uid: 'u1', author: 'a1', at: 15125, thumb: 'https://img/1.jpg' },
  { id: 2, ed: 1, uid: 'u2', author: "O'Brien", at: 20000, thumb: '' },
];
const tas = { u1: [{ by: 'Elliott', t: 8055, id: 12, replay: 'https://tmtas.exchange/api/replay?id=12' }] };
const wr = { u1: { t: 14168, by: 'Arne', date: '2026-02-21' }, u2: { t: 9000, by: 'Zed', date: '2026-01-01' } };

test('gsheet_sync reads tags and videos and flags ones a faster TAS replaced', () => {
  const dir = workspace({
    'data/maps.json': maps, 'data/tas.json': tas,
    'data/gsheet.json': { id: 'SHEET', mapsGid: 0, compGid: 20 },
    // previously: map 1's video and tag were added when the best TAS was 13.788
    'data/videos.json': [{ map: 1, url: 'https://youtu.be/old', title: '', runner: 'Vito', forTas: 13.788, outdated: false }],
    'data/classify.json': { u1: { cut: 'Noseboost', rating: 'Good', forTas: 13.788 } },
    'maps.csv': toCsv([
      ['#', 'Edition', 'TAS by', 'Cut', 'Rating', 'Video link', 'Video title'],
      ['1', 'KR1', 'Elliott', 'Noseboost', 'Good', 'https://youtu.be/old', ''],
      ['2', 'KR1', '', 'Uber', '', 'javascript:alert(1)', 'ignored'],
    ]),
    'comp.csv': toCsv([['Map #', 'Runner', 'Video link', 'Title'], ['', 'Someone', 'https://youtu.be/comp', 'Best of, KR1']]),
  });
  const out = run(dir, 'scripts/gsheet_sync.mjs', { MOCK_FETCH: JSON.stringify({ 'gid=0': join(dir, 'maps.csv'), 'gid=20': join(dir, 'comp.csv') }) });
  assert.match(out, /2 tagged \(1 outdated\), 2 videos \(1 outdated\)/);
  const cls = json(dir, 'data/classify.json'), vids = json(dir, 'data/videos.json');
  assert.equal(cls.u1.outdated, true, 'tag was for the old run');
  assert.deepEqual([cls.u2.cut, cls.u2.forTas, cls.u2.outdated], ['Uber', null, false]);
  assert.equal(vids[0].outdated, true, 'video was for the old run');
  assert.equal(vids[0].runner, 'Vito', 'keeps the original runner');
  assert.deepEqual(vids[1], { map: null, url: 'https://youtu.be/comp', title: 'Best of, KR1', runner: 'Someone', forTas: null, outdated: false });
  assert.equal(vids.length, 2, 'non-http links are dropped');
});

test('gsheet_sync keeps previous data when the sheet is not reachable', () => {
  const prev = [{ map: 1, url: 'https://youtu.be/x' }];
  const dir = workspace({ 'data/maps.json': maps, 'data/tas.json': tas, 'data/gsheet.json': { id: 'SHEET', mapsGid: 0 }, 'data/videos.json': prev });
  run(dir, 'scripts/gsheet_sync.mjs', { MOCK_FETCH: '{}' });
  assert.deepEqual(json(dir, 'data/videos.json'), prev);
});

test('build_pages writes share pages with escaped preview tags and the sheet feeds', () => {
  const dir = workspace({ 'data/maps.json': maps, 'data/tas.json': tas, 'data/wr.json': wr, 'data/classify.json': {}, 'data/videos.json': [] });
  run(dir, 'scripts/build_pages.mjs', { SITE_URL: 'https://site.example' });
  const m1 = readFileSync(join(dir, 'm/1.html'), 'utf8');
  assert.match(m1, /og:description" content="TAS 8\.055 by Elliott \(−6\.113 vs WR 14\.168 by Arne\)"/);
  assert.match(m1, /og:image" content="https:\/\/img\/1\.jpg"/);
  assert.match(m1, /og:url" content="https:\/\/site\.example\/m\/1\.html"/);
  assert.ok(existsSync(join(dir, 'p/Elliott.html')));
  const core = readFileSync(join(dir, 'data/sheet_core.csv'), 'utf8').split('\n');
  assert.equal(core[0], '#,Edition,Author,WR (s),WR holder,Best TAS (s),TAS by,Gap vs WR (s)');
  assert.equal(core[1], '1,KR1,a1,14.168,Arne,8.055,Elliott,-6.113');
  assert.equal(core[2], "2,KR1,O'Brien,9,Zed,,,");
});
