// Pure helpers shared by the site (browser) and the build scripts (Node). No DOM access here.

/** Rating → points for the average score. */
export const SCORE = { Great: 100, Good: 75, Okay: 50, Meh: 25 };

/** 8055 → "8.055", 62005 → "1:02.005", null → "—" */
export function fmt(ms) {
  if (ms == null) return '—';
  const m = Math.floor(ms / 60000), s = Math.floor(ms / 1000) % 60, r = ms % 1000;
  return (m ? `${m}:${String(s).padStart(2, '0')}` : `${s}`) + '.' + String(r).padStart(3, '0');
}

/** Signed gap: -380 → "−0.380", 1200 → "+1.200" */
export const fmtGap = (d) => (d == null ? '' : (d < 0 ? '−' : '+') + fmt(Math.abs(d)));

/** Escape text for HTML content and attribute values. */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** File-safe, reversible-enough name for share pages: "O'Neil" → "O_27Neil". Must match scripts/build_pages.mjs. */
export const slug = (n) => String(n).replace(/[^A-Za-z0-9._-]/g, (c) => '_' + c.codePointAt(0).toString(16));

/** decodeURIComponent that never throws on malformed input. */
export const safeDecode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };

/** Unix seconds → "5 min ago" / "3 h ago" / "2 d ago" / date. */
export function ago(unix, now = Date.now()) {
  if (!unix) return '';
  const s = now / 1000 - unix;
  if (s < 3600) return Math.max(1, Math.round(s / 60)) + ' min ago';
  if (s < 86400) return Math.round(s / 3600) + ' h ago';
  if (s < 86400 * 30) return Math.round(s / 86400) + ' d ago';
  return new Date(unix * 1000).toLocaleDateString();
}

/** Average rating score of maps (by their `rating`), "—" if none rated. */
export function score(maps) {
  const r = maps.filter((m) => SCORE[m.rating]);
  return r.length ? (r.reduce((s, m) => s + SCORE[m.rating], 0) / r.length).toFixed(2) : '—';
}
