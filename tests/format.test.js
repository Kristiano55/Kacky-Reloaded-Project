import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmt, fmtGap, esc, slug, safeDecode, ago, score } from '../js/format.js';

test('fmt formats milliseconds like the game', () => {
  assert.equal(fmt(8055), '8.055');
  assert.equal(fmt(62005), '1:02.005');
  assert.equal(fmt(600000), '10:00.000');
  assert.equal(fmt(0), '0.000');
  assert.equal(fmt(null), '—');
  assert.equal(fmt(undefined), '—');
});

test('fmtGap signs the difference', () => {
  assert.equal(fmtGap(-380), '−0.380');
  assert.equal(fmtGap(1200), '+1.200');
  assert.equal(fmtGap(null), '');
});

test('esc neutralises HTML and quotes', () => {
  assert.equal(esc(`<a href="x" onclick='y'>&`), '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;');
  assert.equal(esc(null), '');
});

test('slug is file-safe and distinguishes names', () => {
  assert.equal(slug('Razzer'), 'Razzer');
  assert.equal(slug("O'Neil"), 'O_27Neil');
  assert.equal(slug('a b'), 'a_20b');
  assert.notEqual(slug('a b'), slug('a_b'));
  assert.match(slug('<script>'), /^[A-Za-z0-9._-]+$/);
});

test('safeDecode never throws', () => {
  assert.equal(safeDecode('Ra%20zzer'), 'Ra zzer');
  assert.equal(safeDecode('%E0%A4%A'), '%E0%A4%A');
});

test('ago buckets', () => {
  const now = 1_800_000_000_000;
  assert.equal(ago(now / 1000 - 120, now), '2 min ago');
  assert.equal(ago(now / 1000 - 3 * 3600, now), '3 h ago');
  assert.equal(ago(now / 1000 - 2 * 86400, now), '2 d ago');
  assert.equal(ago(0, now), '');
});

test('score averages ratings and ignores unrated', () => {
  assert.equal(score([{ rating: 'Great' }, { rating: 'Good' }, { rating: '' }]), '87.50');
  assert.equal(score([{ rating: '' }]), '—');
});
