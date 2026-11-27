import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, toCsv } from '../scripts/lib/csv.mjs';
import { stampHtml, stampImports } from '../scripts/lib/stamp.mjs';

test('CSV round-trips quotes, commas and newlines', () => {
  const rows = [['#', 'Title'], ['1', 'My, "best" run'], ['2', 'two\nlines'], ['3', '']];
  assert.deepEqual(parseCsv(toCsv(rows)), rows);
});

test('CSV parses Windows line endings and a missing final newline', () => {
  assert.deepEqual(parseCsv('a,b\r\n1,2'), [['a', 'b'], ['1', '2']]);
});

test('cache-busting stamps html and relative module imports only', () => {
  assert.equal(stampHtml('<script src="js/main.js?v=dev">', 'abc'), '<script src="js/main.js?v=abc">');
  const src = `import { a } from './a.js';\nimport { b } from "../b.js";\nimport x from 'https://cdn/x.js';\nconst c = await import('./c.js');`;
  assert.equal(stampImports(src, 'abc'),
    `import { a } from './a.js?v=abc';\nimport { b } from "../b.js?v=abc";\nimport x from 'https://cdn/x.js';\nconst c = await import('./c.js?v=abc');`);
  assert.equal(stampImports(stampImports(src, 'abc'), 'def'), stampImports(src, 'abc'), 'already stamped imports are left alone');
});
