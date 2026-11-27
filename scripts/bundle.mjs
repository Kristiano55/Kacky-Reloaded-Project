// Deploy step: assemble _site/ with only what visitors need —
//   one minified JS bundle (instead of 14 modules), minified CSS, fonts, thumbnails,
//   data/site.json + data/inputs + sheet feeds, and the m/ p/ share pages.
// Development keeps the readable sources (index.html → js/main.js); only _site/ is rewritten.
// Run after scripts/build_pages.mjs. Usage: node scripts/bundle.mjs
import { readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const OUT = '_site';
const esbuild = (args) => execFileSync('npx', ['--yes', 'esbuild@0.28.2', ...args], { stdio: 'inherit' });

await rm(OUT, { recursive: true, force: true });
await mkdir(`${OUT}/js`, { recursive: true });
await mkdir(`${OUT}/data`, { recursive: true });

esbuild(['js/main.js', '--bundle', '--minify', '--format=esm', '--target=es2020', '--legal-comments=none', `--outfile=${OUT}/js/app.min.js`]);
esbuild(['style.css', '--minify', `--outfile=${OUT}/style.min.css`]);

const html = (await readFile('index.html', 'utf8'))
  .replace('src="js/main.js?v=dev"', 'src="js/app.min.js?v=dev"')
  .replace('href="style.css?v=dev"', 'href="style.min.css?v=dev"');
if (!html.includes('app.min.js') || !html.includes('style.min.css')) throw new Error('bundle: index.html references not found');
await writeFile(`${OUT}/index.html`, html);
await writeFile(`${OUT}/.nojekyll`, '');

const copy = async (from, to = from) => { if (existsSync(from)) await cp(from, `${OUT}/${to}`, { recursive: true }); };
for (const d of ['fonts', 'thumbs', 'm', 'p', 'data/inputs']) await copy(d);
for (const f of ['site.json', 'sheet_core.csv', 'sheet_extra.csv']) await copy(`data/${f}`);
// raw JSON stays published for anyone building on the data (bots, other sites)
for (const f of ['maps.json', 'wr.json', 'tas.json', 'classify.json', 'videos.json', 'tas_dates.json', 'updated.json']) await copy(`data/${f}`);
console.log(`bundle: ${OUT}/ ready`);
