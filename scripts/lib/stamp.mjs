// Cache-busting helpers (see scripts/cache_bust.mjs).
export const stampHtml = (html, ver) => html.replaceAll('?v=dev', `?v=${ver}`);
/** Add ?v=<ver> to relative ES module imports: from './x.js' / import('../y.js') */
export const stampImports = (src, ver) =>
  src.replace(/(\bfrom\s+|\bimport\s*\(\s*)(['"])(\.{1,2}\/[^'"?]+\.js)\2/g, `$1$2$3?v=${ver}$2`);
