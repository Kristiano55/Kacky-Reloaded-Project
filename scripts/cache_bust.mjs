// Deploy step: stamp every asset URL with the commit, so browsers never mix old and new files.
//   index.html:  style.css?v=dev, js/main.js?v=dev   ->  ?v=<sha>
//   js/**/*.js:  import ... from './x.js'           ->  './x.js?v=<sha>'
// Usage: node scripts/cache_bust.mjs <version>
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { stampHtml, stampImports } from './lib/stamp.mjs';

const v = process.argv[2];
if (!v) { console.error('usage: node scripts/cache_bust.mjs <version>'); process.exit(1); }

async function* jsFiles(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) yield* jsFiles(join(dir, e.name));
    else if (e.name.endsWith('.js')) yield join(dir, e.name);
  }
}

await writeFile('index.html', stampHtml(await readFile('index.html', 'utf8'), v));
let n = 0;
for await (const f of jsFiles('js')) { await writeFile(f, stampImports(await readFile(f, 'utf8'), v)); n++; }
console.log(`cache-bust: index.html + ${n} modules -> v=${v}`);
