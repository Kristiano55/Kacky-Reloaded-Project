// Syntax-check every JavaScript file in the project (no dependencies needed).
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const SKIP = new Set(['node_modules', '.git', 'tools', 'data', 'm', 'p', '.state']);
async function* files(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP.has(e.name)) yield* files(join(dir, e.name)); }
    else if (/\.(m?js)$/.test(e.name)) yield join(dir, e.name);
  }
}
let n = 0;
for await (const f of files('.')) { execFileSync(process.execPath, ['--check', f], { stdio: 'inherit' }); n++; }
console.log(`syntax ok: ${n} files`);
